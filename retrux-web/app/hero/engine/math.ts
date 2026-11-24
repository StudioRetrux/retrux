/**
 * Motion helpers. Everything is frame-rate independent so the hero feels the
 * same at 30, 60 and 120 Hz.
 */

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const fit = (v: number, a: number, b: number, c: number, d: number) =>
  lerp(c, d, invLerp(a, b, v));

export const smoothstep = (a: number, b: number, v: number) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a: number, b: number, v: number) => {
  const t = invLerp(a, b, v);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/**
 * Exponential approach: moves `current` towards `target`, covering `k` of the
 * remaining distance per 60 Hz frame, scaled correctly for any `dt`.
 */
export const damp = (current: number, target: number, k: number, dt: number) =>
  lerp(current, target, 1 - Math.pow(1 - k, dt * 60));

/** Same as `damp` but parameterised by half-life in seconds. */
export const dampHalfLife = (current: number, target: number, halfLife: number, dt: number) =>
  halfLife <= 0 ? target : lerp(current, target, 1 - Math.pow(0.5, dt / halfLife));

/** A damped spring (semi-implicit Euler, sub-stepped for stability). */
export class Spring {
  value: number;
  velocity = 0;
  target: number;

  constructor(
    value = 0,
    /** Angular frequency in rad/s (higher = faster). */
    public omega = 6,
    /** Damping ratio: 1 = critical, < 1 overshoots. */
    public zeta = 1,
  ) {
    this.value = value;
    this.target = value;
  }

  update(dt: number) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = -2 * this.zeta * this.omega * this.velocity - this.omega * this.omega * (this.value - this.target);
      this.velocity += a * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  snap(v: number) {
    this.value = v;
    this.target = v;
    this.velocity = 0;
  }
}

/** Cubic-bezier easing (CSS semantics), solved with Newton iterations. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    return sy(clamp(t));
  };
}

export const ease = {
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  /** Soft "in-out" with a long tail, used for the intro and reveals. */
  inOutSoft: cubicBezier(0.6, 0, 0.1, 1),
  outSoft: cubicBezier(0.16, 1, 0.3, 1),
};

/**
 * Samples an evenly spaced keyframe table (first value at t = 0, last at t = duration)
 * with linear interpolation; clamps outside the range.
 */
export function sampleCurve(values: readonly number[], t: number, duration: number) {
  if (t <= 0) return values[0];
  if (t >= duration) return values[values.length - 1];
  const x = (t / duration) * (values.length - 1);
  const i = Math.floor(x);
  return lerp(values[i], values[i + 1], x - i);
}

/** Samples sparse (time, value) keys with linear interpolation; clamps outside the range. */
export function sampleKeys(keys: readonly (readonly [number, number])[], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return lerp(v0, v1, (t - t0) / (t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
}

/** Deterministic hash in [0, 1) for per-object variation. */
export const hash1 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
