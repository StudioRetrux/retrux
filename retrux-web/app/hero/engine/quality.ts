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

/**
 * 22 Nov (client's iPhone Safari recording: "overall low ress, flicker or glitch everywhere"): on phones T0 rendered at DPR 1 x
 * 0.6-0.85, i.e. a 250-350 px wide image stretched over an 828 px screen. Touch devices now render T0 at up to DPR 2: the
 * governor starts at 0.6 (DPR 1.2, twice the old maximum's pixels), rises to 1 in two steps while the frame rate holds and only
 * goes down while that buys frame rate, to 0.4 (DPR 0.8, the old maximum). Desktop T0 (integrated GPUs, DPR 1 screens) keeps its profile. `?t0res=r11` restores the old phone profile exactly.
 */
export function profileFor(tier: TierName): QualityProfile {
  const base = PROFILES[tier];
  if (!base || tier !== "T0" || typeof navigator === "undefined" || !(navigator.maxTouchPoints > 0)) return base;
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("t0res") === "r11") return base;
  return { ...base, maxDpr: 2, minScale: 0.4, maxScale: 1, startScale: 0.6 };
}

/** `?gov=r11` restores the round-11 governor exactly (no gain check, 4 flips). */
const GOV_R11 = typeof location !== "undefined" && new URLSearchParams(location.search).get("gov") === "r11";

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
  /** Governor v2: the last step down, waiting for its effect ({ from: the scale before it, fps: the frame rate before it }). */
  private pending: { from: number; fps: number } | null = null;
  /** Governor v2: a step down bought no frame rate (the device is not fill-bound): the scale went back and stays. */
  private pinned = false;
  /** Governor v2: a step down that did buy frame rate has happened: going back up needs a long, steady surplus. */
  private dropped = false;
  /** Governor v2: frames up to this time are not measured (the re-allocation hitch and the mixed window right after a change). */
  private skipUntil = 0;

  constructor(private profile: QualityProfile) {
    this._scale = Math.min(profile.maxScale, Math.max(profile.minScale, profile.startScale ?? profile.maxScale));
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
    if (!GOV_R11 && nowMs < this.skipUntil) return false;
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
    // Governor v2 (22 Nov, client: "flicker" on desktop, a 250 px wide image on the iPhone): a lower render scale is only worth
    // its blur when it buys frame rate. (1) Each step down is checked at the next decision: with less than max(2.5 fps, 6 %)
    // gained, the frame is not fill-bound (a CPU / compositor limit, a 30 fps cap, a recording): the scale goes back and is
    // pinned for the session. (2) After a step down that did help, the scale only rises again after six steady decisions
    // above 58 fps, and two direction changes end the hunting (each change re-allocates every target: a visible pop).
    if (!GOV_R11) {
      if (this.pinned) return false;
      if (this.pending) {
        const p = this.pending;
        this.pending = null;
        if (fps - p.fps < Math.max(2.5, 0.06 * p.fps)) {
          this._scale = p.from;
          this.pinned = true;
          this.highStreak = 0;
          this.settle(nowMs);
          return true;
        }
        this.dropped = true;
      }
      if (this.flips >= 2) return false;
    }
    if (fps < 50 && this._scale > minScale + 1e-3) {
      if (!GOV_R11) this.pending = { from: this._scale, fps };
      this._scale = Math.max(minScale, this._scale - 0.1);
      dir = -1;
      this.highStreak = 0;
    } else if (fps > 58) {
      this.highStreak++;
      if (this.highStreak >= (!GOV_R11 && this.dropped ? 6 : 2) && this._scale < maxScale - 1e-3) {
        // (v2: a session that never had to step down rises in steps of 0.2: two pops to the maximum instead of eight.)
        this._scale = Math.min(maxScale, this._scale + (!GOV_R11 && !this.dropped ? 0.2 : 0.05));
        dir = 1;
        this.highStreak = 0;
      }
    } else {
      this.highStreak = 0;
    }
    if (dir !== 0) {
      if (this.lastDir !== 0 && dir !== this.lastDir) this.flips++;
      this.lastDir = dir;
      if (!GOV_R11) this.settle(nowMs);
      return true;
    }
    return false;
  }

  /** Governor v2: after a scale change, start a clean measurement 0.7 s later (the change's own hitch is not the new scale's speed). */
  private settle(nowMs: number) {
    this.skipUntil = nowMs + 700;
    this.windowMs = 0;
    this.windowFrames = 0;
    this.samples = [];
  }
}

/**
 * P4 lanes (20 Nov): a lane writes its shader changes as `#ifdef <name>` blocks (with `#else` holding the line it replaces). When
 * the lane is off (its URL switch, or a tier it does not run on) the blocks are resolved here, `#else` parts kept and the rest
 * dropped, so the program source is byte-identical to the build without the lane (ident: every linked program, not only pixels).
 * On, the source is returned as is (the material then defines `<name>`).
 */
export function laneSource(src: string, name: string, on: boolean): string {
  if (on) return src;
  const out: string[] = [];
  // One entry per open #if: `mine` for `#ifdef <name>`, `keep` whether its current branch is emitted (off: only the #else part).
  const stack: { mine: boolean; keep: boolean }[] = [];
  const emitting = () => stack.every((s) => !s.mine || s.keep);
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#if")) {
      const mine = t === `#ifdef ${name}`;
      if (!mine && emitting()) out.push(line);
      stack.push({ mine, keep: false });
    } else if (t.startsWith("#else")) {
      const top = stack[stack.length - 1];
      if (top?.mine) top.keep = true;
      else if (emitting()) out.push(line);
    } else if (t.startsWith("#endif")) {
      const top = stack.pop();
      if (!top?.mine && emitting()) out.push(line);
    } else if (emitting()) {
      out.push(line);
    }
  }
  return out.join("\n");
}

/** True when even the minimum scale cannot hold ~28 fps: the engine should drop a tier. */
export function suggestDowngrade(profile: QualityProfile, scale: number, avgFps: number) {
  return profile.tier !== "T0" && scale <= profile.minScale + 1e-3 && avgFps < 28;
}
