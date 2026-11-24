import type { QualityProfile, TierName } from "./types";

/**
 * GPU tiers and an adaptive render-scale controller (in the spirit of
 * igloo.inc's: small steps, long windows, freezes after repeated flips).
 */

/**
 * User, 19 Nov (on an iPhone and a friend's phone): "malah show ice yang lama" = phones still showed the round-10 ice.
 * Phones are T0, which kept the round-10 ice / orb / crystals for frame budget (the traced section cost x1.26-1.45 of the
 * round-10 T0 ice). T0 now runs the round-11 look at its minimum (ice march 3, orb 8 with the round-11 fills); the
 * adaptive render scale absorbs the cost. `?t0ice=r10` restores the round-10 T0 hero exactly.
 */
const T0_R10 = typeof location !== "undefined" && new URLSearchParams(location.search).get("t0ice") === "r10";

export const PROFILES: Record<TierName, QualityProfile> = {
  T0: {
    tier: "T0",
    maxDpr: 1,
    minScale: 0.6,
    maxScale: 0.85,
    msaa: 0,
    refractionScale: 0.5,
    backDepthScale: 0,
    reflectionScale: 0.25,
    ice: { marchSteps: T0_R10 ? 2 : 3, dispersionTaps: 1, bubbles: false },
    iceBehindIce: false,
    orb: { marchSteps: 8, r11: !T0_R10 },
    // The 18 authored crystals only: the reference shows two belts of 9, nothing more.
    shards: { count: 18 },
    post: { bloomLevels: 4, fxaa: true, grain: false, chromatic: false },
  },
  T1: {
    tier: "T1",
    maxDpr: 1.25,
    minScale: 0.7,
    maxScale: 1,
    // MSAA is cheap on the tile-based Apple GPUs this tier targets, and the ring silhouettes need it.
    msaa: 4,
    refractionScale: 0.5,
    backDepthScale: 0.5,
    reflectionScale: 0.5,
    ice: { marchSteps: 4, dispersionTaps: 1, bubbles: false }, // dispersion fringes read as opal (QC round 2)
    iceBehindIce: true,
    orb: { marchSteps: 16 },
    shards: { count: 18 },
    // MSAA covers the edges; FXAA on top only softened them.
    post: { bloomLevels: 5, fxaa: false, grain: true, chromatic: true },
  },
  T2: {
    tier: "T2",
    maxDpr: 1.5,
    minScale: 0.85,
    maxScale: 1,
    msaa: 4,
    refractionScale: 0.5,
    backDepthScale: 1,
    reflectionScale: 0.5,
    ice: { marchSteps: 8, dispersionTaps: 3, bubbles: true },
    iceBehindIce: true,
    orb: { marchSteps: 24 },
    shards: { count: 18 },
    post: { bloomLevels: 6, fxaa: false, grain: true, chromatic: true },
  },
};

const RULES: [RegExp, TierName][] = [
  [/swiftshader|llvmpipe|software|basic render|microsoft basic/i, "T0"],
  [/rtx|quadro rtx|titan|rx\s*[67]\d{3}|radeon pro w[67]|arc\s*a[57]\d{2}|apple m\d (pro|max|ultra)/i, "T2"],
  [/iris\s*xe|arc\s*a3\d{2}|apple m\d|apple gpu.*m\d|gtx\s*(9|10|16)\d{2}|mx\s*\d{3}|rx\s*[45]\d{2}|vega|radeon.*(r9|rx)/i, "T1"],
  [/intel.*(hd|uhd|iris(\(r\))?\s*(plus|pro)?)|adreno|mali|powervr|apple gpu/i, "T0"],
];

/** Classifies the GPU from the unmasked renderer string (ANGLE strings included). */
export function detectTier(gl: WebGL2RenderingContext): { tier: TierName; gpu: string; reason: string } {
  let gpu = "unknown";
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch {
    // Some browsers throw on the debug extension; fall back to heuristics.
  }
  const clean = gpu.replace(/^ANGLE \(/i, "").replace(/\(R\)|\(TM\)/gi, "").replace(/\s+/g, " ");
  let tier: TierName = "T1";
  let reason = "default";
  for (const [re, t] of RULES) {
    if (re.test(clean)) {
      tier = t;
      reason = `renderer matches ${re.source.slice(0, 40)}`;
      break;
    }
  }
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }) : undefined;
  // Safari reports every Apple Silicon GPU as "Apple GPU": desktop Macs are at least M1 class.
  if (/^apple gpu$/i.test(clean.trim()) && nav && nav.maxTouchPoints === 0 && /mac/i.test(nav.userAgent)) {
    tier = "T1";
    reason = "Safari on an Apple Silicon Mac";
  }
  const cores = nav?.hardwareConcurrency ?? 8;
  const mem = nav?.deviceMemory ?? 8;
  if (tier !== "T0" && (cores <= 4 || mem <= 4) && /intel|adreno|mali|apple gpu/i.test(clean)) {
    tier = "T0";
    reason += `; downgraded (cores ${cores}, memory ${mem} GB)`;
  }
  if (typeof location !== "undefined") {
    const forced = new URLSearchParams(location.search).get("tier");
    if (forced === "T0" || forced === "T1" || forced === "T2") {
      tier = forced;
      reason = "forced by ?tier=";
    }
  }
  return { tier, gpu: clean, reason };
}

export class AdaptiveScale {
  private _scale: number;
  private windowMs = 0;
  private windowFrames = 0;
  private samples: number[] = [];
  private startedAt = -1;
  private lastDecision = 0;
  private highStreak = 0;
  private lastDir = 0;
  private flips = 0;
  /** `?scale=0.75` pins the render scale (validation captures, perf comparisons). */
  private locked = false;

  constructor(private profile: QualityProfile) {
    this._scale = profile.maxScale;
    const forced = typeof location !== "undefined" ? Number(new URLSearchParams(location.search).get("scale")) : NaN;
    if (forced > 0) {
      this._scale = Math.min(1, Math.max(0.25, forced));
      this.locked = true;
    }
  }

  get scale() {
    return this._scale;
  }

  reset() {
    this.windowMs = 0;
    this.windowFrames = 0;
    this.samples = [];
    this.startedAt = -1;
    this.highStreak = 0;
  }

  /** Feed one frame; returns true when the scale changed. */
  update(frameMs: number, nowMs: number) {
    if (this.locked) return false;
    if (this.startedAt < 0) {
      this.startedAt = nowMs;
      this.lastDecision = nowMs;
    }
    if (nowMs - this.startedAt < 2000 || this.flips >= 4) return false;
    this.windowMs += frameMs;
    this.windowFrames++;
    if (this.windowMs >= 500) {
      this.samples.push((this.windowFrames * 1000) / this.windowMs);
      this.windowMs = 0;
      this.windowFrames = 0;
    }
    if (nowMs - this.lastDecision < 3000 || this.samples.length < 5) return false;
    this.lastDecision = nowMs;
    const fps = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.samples = [];
    const { minScale, maxScale } = this.profile;
    let dir = 0;
    if (fps < 50 && this._scale > minScale + 1e-3) {
      this._scale = Math.max(minScale, this._scale - 0.1);
      dir = -1;
      this.highStreak = 0;
    } else if (fps > 58) {
      this.highStreak++;
      if (this.highStreak >= 2 && this._scale < maxScale - 1e-3) {
        this._scale = Math.min(maxScale, this._scale + 0.05);
        dir = 1;
        this.highStreak = 0;
      }
    } else {
      this.highStreak = 0;
    }
    if (dir !== 0) {
      if (this.lastDir !== 0 && dir !== this.lastDir) this.flips++;
      this.lastDir = dir;
      return true;
    }
    return false;
  }
}

/** True when even the minimum scale cannot hold ~28 fps: the engine should drop a tier. */
export function suggestDowngrade(profile: QualityProfile, scale: number, avgFps: number) {
  return profile.tier !== "T0" && scale <= profile.minScale + 1e-3 && avgFps < 28;
}
