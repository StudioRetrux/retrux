// G1c validation on a synthetic edge: a straight edge translating at a constant sub-pixel speed, pixel coverage from 4 samples
// (the 4x MSAA rotated grid) vs 16 (the GT recipe: 2x2 pixels of that pattern at half size) vs the exact area, optional 3x3
// Gaussian (EnvEdge-like) and a motion-compensated EMA (TAA-like, CR history clamped to 2x2, clip 3x3 minmax & variance).
import { findCrossings, linkTracks, trackJerk } from "./glidecore.mjs";
const W = 96, H = 48;
const RG4 = [[-2, -6], [6, -2], [-6, 2], [2, 6]].map(([x, y]) => [x / 16, y / 16]);
const S16 = [];
for (const [ox, oy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) for (const [x, y] of RG4) S16.push([ox + x / 2, oy + y / 2]);
const EX = [];
for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) EX.push([(i + 0.5) / 16 - 0.5, (j + 0.5) / 16 - 0.5]);
function render(theta, d, pat, texAmp, tx, ty) {
  const nx = Math.cos(theta), ny = Math.sin(theta);
  const o = new Float32Array(W * H), c = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let cov = 0;
      for (const [sx, sy] of pat) if (nx * (x + 0.5 + sx - W / 2) + ny * (y + 0.5 + sy - H / 2) > d) cov++;
      cov /= pat.length;
      // lake texture moving with the scene (stripes), solid flat
      const tex = texAmp ? texAmp * Math.sin(0.9 * (x - tx) + 0.4 * (y - ty)) : 0;
      o[y * W + x] = 60 + (200 + tex - 60) * cov;
      c[y * W + x] = cov;
    }
  return { o, c };
}
function blur(I, sigma) {
  if (!sigma) return I;
  const s2 = 2 * sigma * sigma, w1 = Math.exp(-1 / s2), w2 = Math.exp(-2 / s2), n = 1 + 4 * w1 + 4 * w2;
  const o = new Float32Array(I.length);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const g = (dx, dy) => I[Math.min(H - 1, Math.max(0, y + dy)) * W + Math.min(W - 1, Math.max(0, x + dx))];
      o[y * W + x] = (g(0, 0) + w1 * (g(1, 0) + g(-1, 0) + g(0, 1) + g(0, -1)) + w2 * (g(1, 1) + g(-1, 1) + g(1, -1) + g(-1, -1))) / n;
    }
  return o;
}
const crw = (t) => [t * (-0.5 + t * (1 - 0.5 * t)), 1 + t * t * (-2.5 + 1.5 * t), t * (0.5 + t * (2 - 1.5 * t)), t * t * (-0.5 + 0.5 * t)];
function histSample(P, x, y) {
  // Catmull-Rom at pixel-centre coords (x, y) then clamped to the 2x2 footprint
  const fx = x - 0.5, fy = y - 0.5, ix = Math.floor(fx), iy = Math.floor(fy);
  const wx = crw(fx - ix), wy = crw(fy - iy);
  const g = (xx, yy) => P[Math.min(H - 1, Math.max(0, yy)) * W + Math.min(W - 1, Math.max(0, xx))];
  let r = 0;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) r += wx[i] * wy[j] * g(ix - 1 + i, iy - 1 + j);
  const a = g(ix, iy), b = g(ix + 1, iy), c = g(ix, iy + 1), d = g(ix + 1, iy + 1);
  return Math.min(Math.max(a, b, c, d), Math.max(Math.min(a, b, c, d), r));
}
function taa(seq, vx, vy, wfun, gamma = 1.25) {
  const out = [];
  let prev = null;
  for (let k = 0; k < seq.length; k++) {
    const C = seq[k];
    if (!prev) {
      out.push(C);
      prev = C;
      continue;
    }
    const o = new Float32Array(C.length);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let mn = 1e9, mx = -1e9, m1 = 0, m2 = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const v = C[Math.min(H - 1, Math.max(0, y + dy)) * W + Math.min(W - 1, Math.max(0, x + dx))];
            mn = Math.min(mn, v);
            mx = Math.max(mx, v);
            m1 += v;
            m2 += v * v;
          }
        const mu = m1 / 9, sd = Math.sqrt(Math.max(0, m2 / 9 - mu * mu));
        let h = histSample(prev, x + 0.5 - vx, y + 0.5 - vy);
        h = Math.min(Math.min(mx, mu + gamma * sd), Math.max(Math.max(mn, mu - gamma * sd), h));
        const w = wfun(Math.hypot(vx, vy));
        o[y * W + x] = (1 - w) * C[y * W + x] + w * h;
      }
    out.push(o);
    prev = o;
  }
  return out;
}
const N = 120;
const rows = [];
for (const [label, theta] of [["near-vertical 8deg", (8 * Math.PI) / 180], ["near-horizontal 80deg", (80 * Math.PI) / 180]]) {
  for (const v of [0.03, 0.07, 0.13, 0.31, 0.7]) {
    for (const texAmp of [0]) {
      // the scene translates by (vx, vy) per frame along the edge normal's dominant axis
      const vx = theta < 0.8 ? v : 0, vy = theta < 0.8 ? 0 : v;
      const nx = Math.cos(theta), ny = Math.sin(theta);
      const frames = { ex: [], s4: [], s16: [], cov: [] };
      for (let k = 0; k < N; k++) {
        const d = -6 + nx * vx * k + ny * vy * k;
        const tx = vx * k, ty = vy * k;
        const e = render(theta, d, EX, texAmp, tx, ty);
        frames.ex.push(e.o);
        frames.cov.push(Uint8Array.from(e.c, (q) => Math.round(q * 255)));
        frames.s4.push(render(theta, d, RG4, texAmp, tx, ty).o);
        frames.s16.push(render(theta, d, S16, texAmp, tx, ty).o);
      }
      const vars = {
        exact: frames.ex,
        "4": frames.s4,
        "16": frames.s16,
        "4+s0.6": frames.s4.map((f) => blur(f, 0.6)),
        "16+s0.3": frames.s16.map((f) => blur(f, 0.3)),
        "4+taa.5": taa(frames.s4, vx, vy, () => 0.5),
        "4+taa.8": taa(frames.s4, vx, vy, () => 0.8),
        "4+taa.9": taa(frames.s4, vx, vy, () => 0.9),
        "4+taaAd": taa(frames.s4, vx, vy, (s) => { const n = Math.min(25, 0.25 / Math.max(1e-3, s)); return Math.max(0.5, Math.min(0.92, (n - 1) / (n + 1))); }),
      };
      const names = Object.keys(vars);
      const hero = new Uint8Array(W * H);
      const cpf = frames.cov.map((cov) => [...findCrossings(cov, hero, W, H, [4, 4, W - 4, H - 4], 0), ...findCrossings(cov, hero, W, H, [4, 4, W - 4, H - 4], 1)]);
      const tracks = linkTracks(cpf);
      const r = trackJerk(tracks, names.length, (vi, k) => vars[names[vi]][k], W, H, null, { lvlR: 3, est: process.env.EST || "cross" });
      rows.push({ label, v, texAmp, n: r[0].n, rms: Object.fromEntries(names.map((nm, i) => [nm, r[i].rms])) });
    }
  }
}
const names = Object.keys(rows[0].rms);
console.log("case".padEnd(34) + "n".padStart(6) + names.map((n) => n.padStart(9)).join(""));
for (const r of rows) console.log(`${r.label} v${r.v} tex${r.texAmp}`.padEnd(34) + String(r.n).padStart(6) + names.map((n) => r.rms[n].toFixed(4).padStart(9)).join(""));
