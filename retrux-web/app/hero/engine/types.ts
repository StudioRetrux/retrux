/**
 * Contracts shared by the engine modules, the DOM UI layer and the audio engine.
 */

/** three.js layers, one per render pass group. */
export const LAYER = {
  ENV: 1, // plate proxies, water, clouds
  SHARDS: 2,
  ORB: 3,
  RINGS: 4,
} as const;

export type TierName = "T0" | "T1" | "T2";

/**
 * Per-tier quality. T0 = integrated GPUs like Intel Iris Plus 640 / UHD 620,
 * T1 = Iris Xe / Apple M1 / GTX 1050-1650, T2 = discrete RTX / M1 Pro and up.
 */
export type QualityProfile = {
  tier: TierName;
  /** Device-pixel-ratio cap for the main HDR target. */
  maxDpr: number;
  /** Adaptive render-scale range (multiplied with the DPR). */
  minScale: number;
  maxScale: number;
  /** MSAA samples on the main HDR target (0 = off). */
  msaa: number;
  /** Size of the refraction copy relative to the main target. */
  refractionScale: number;
  /** Ring back-face depth for real thickness (0 = analytic thickness). */
  backDepthScale: number;
  /** Size of the hero reflection target relative to the main target (0 = off). */
  reflectionScale: number;
  ice: { marchSteps: number; dispersionTaps: 1 | 3; bubbles: boolean };
  /**
   * Ice behind ice: the rings are drawn in two halves split at the orb's view depth, the far half first, then
   * (over a fresh screen copy) the near half, which refracts it. Costs one more copy and a second ring draw.
   */
  iceBehindIce: boolean;
  orb: { marchSteps: number };
  shards: { count: number };
  post: { bloomLevels: number; fxaa: boolean; grain: boolean; chromatic: boolean };
};

/** Live interaction / animation state, read by the cursor, audio and DOM reveals. */
export type HeroState = {
  /** Seconds since the engine started rendering. */
  time: number;
  /** Pointer in CSS pixels and in normalized [-1, 1] coordinates (y up). */
  pointer: { x: number; y: number; nx: number; ny: number; active: boolean; type: string };
  /** 0..1, smoothed: pointer over the hero. */
  hover: number;
  /** True while the pointer is pressed (anywhere on the canvas). */
  pressed: boolean;
  /** True once a press has lasted long enough to be a hold (a click never sets it). */
  holding: boolean;
  /** 0..1 spring: press-and-hold progress (drives dolly, shatter, slow-mo). */
  hold: number;
  /** 0..1: outward break of the rings. */
  shatter: number;
  /** Decaying 0..1 pulse fired on press and on release. */
  impulse: number;
  /** Current gyroscope speed multiplier (1 = idle). */
  spin: number;
  /** 0..1: how face-on (concentric) the rings are; 1 = the "eye" pose. */
  alignment: number;
  /** 0..1 intro progress after the reveal starts. */
  intro: number;
  /** 0..1 asset loading progress. */
  loaded: number;
  ready: boolean;
  /** Diagnostics. */
  fps: number;
  tier: TierName;
  renderScale: number;
};

export const createHeroState = (): HeroState => ({
  time: 0,
  pointer: { x: 0, y: 0, nx: 0, ny: 0, active: false, type: "mouse" },
  hover: 0,
  pressed: false,
  holding: false,
  hold: 0,
  shatter: 0,
  impulse: 0,
  spin: 1,
  alignment: 0,
  intro: 0,
  loaded: 0,
  ready: false,
  fps: 60,
  tier: "T1",
  renderScale: 1,
});
