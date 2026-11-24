// AA4X: the GLSL gbaaSil / gbaaPre ported to JS on an hdrcap frame (env resolve: compressed rgb + alpha distance), to see why
// it bails on given pixels.   node silsim.mjs DIR k x0 y0 x1 y1   (top-down frame coords)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const [dir, kArg, X0, Y0, X1, Y1, SIGa, RESa] = process.argv.slice(2);
const SIG = +(SIGa || 1.6), RESMAX = +(RESa || 0.1);
const meta = JSON.parse(fs.readFileSync(path.join(dir, "hdr.json"), "utf8"));
const fr = meta.frames.find((f) => f.k === +kArg);
const W = meta.W, H = meta.H;
const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `e${String(fr.k).padStart(4, "0")}.bin`)));
const buf = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const px = (x, y) => { const i = ((H - 1 - y) * W + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; };
const pi = fr.projInv, mw = fr.mw, cam = [mw[12], mw[13], mw[14]];
const ray = (x, y) => { const nx = ((x + 0.5) / W) * 2 - 1, ny = 1 - ((y + 0.5) / H) * 2; const v = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) v[r] = pi[r] * nx + pi[4 + r] * ny + pi[8 + r] + pi[12 + r];
  const vx = v[0] / v[3], vy = v[1] / v[3], vz = v[2] / v[3];
  const wx = mw[0] * vx + mw[4] * vy + mw[8] * vz, wy = mw[1] * vx + mw[5] * vy + mw[9] * vz, wz = mw[2] * vx + mw[6] * vy + mw[10] * vz;
  const l = Math.hypot(wx, wy, wz); return [wx / l, wy / l, wz / l]; };
const gbH = (x, y, a) => { const r = ray(x, y); if (a <= 1 || r[1] > -1e-5) return [-1e9, 0]; const u = Math.pow(2, Math.floor(Math.log2(a)) - 10);
  const pz = cam[2] + r[2] * (a + 0.5 * u), lv = pz < -14.8718 ? 0.0017 : 0; return [cam[1] + r[1] * (a + 0.5 * u) - lv, -r[1] * u]; };
function cov(s, n) { const a = Math.max(Math.abs(n[0]), Math.abs(n[1])), b = Math.min(Math.abs(n[0]), Math.abs(n[1])); const m = 0.5 * (a + b), k = 0.5 * (a - b), u = Math.abs(s); let c; if (u >= m) c = 1; else if (u <= k) c = 0.5 + u / a; else c = 1 - ((m - u) * (m - u)) / (2 * a * b); return s >= 0 ? c : 1 - c; }
function pdf(s, n) { const a = Math.max(Math.abs(n[0]), Math.abs(n[1])), b = Math.min(Math.abs(n[0]), Math.abs(n[1])); const m = 0.5 * (a + b), k = 0.5 * (a - b), u = Math.abs(s); if (u >= m) return 0; if (u <= k) return 1 / a; return (m - u) / (a * b); }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// note: y grows downwards here; GLSL's y grows upwards (only the sign of the fitted normal's y differs)
function sil(x0, y0) {
  // gbaaPre
  let l = false, s = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = px(x0 + dx, y0 + dy); const h = gbH(x0 + dx, y0 + dy, t[3]); if (h[0] < -1e8) continue; l = l || Math.abs(h[0]) <= h[1]; s = s || h[0] > h[1]; }
  if (!(l && s)) return "pre";
  const cq = [], aq = [], kq = [];
  let dmin = 1e9;
  for (let q = 0; q < 25; q++) { const x = (q % 5) - 2, y = Math.floor(q / 5) - 2; const t = px(x0 + x, y0 + y); const h = gbH(x0 + x, y0 + y, t[3]);
    cq[q] = t; aq[q] = t[3]; kq[q] = h[0] < -1e8 ? 0 : Math.abs(h[0]) <= h[1] ? 1 : h[0] > h[1] ? 2 : 0; if (kq[q] === 2) dmin = Math.min(dmin, t[3]); }
  let S = [0, 0, 0], L = [0, 0, 0], ws = 0, wl = 0;
  for (let q = 0; q < 25; q++) { const x = (q % 5) - 2, y = Math.floor(q / 5) - 2, w = 1 / (0.25 + x * x + y * y);
    if (kq[q] === 2 && aq[q] <= dmin * 1.02 + 0.02) { for (let c = 0; c < 3; c++) S[c] += w * cq[q][c]; ws += w; } else if (kq[q] === 1) { for (let c = 0; c < 3; c++) L[c] += w * cq[q][c]; wl += w; } }
  if (ws <= 0 || wl <= 0) return `pure ws ${ws.toFixed(2)} wl ${wl.toFixed(2)}`;
  S = S.map((v) => v / ws); L = L.map((v) => v / wl);
  const d = [L[0] - S[0], L[1] - S[1], L[2] - S[2]], dd = dot(d, d);
  if (dd < 4e-4) return "contrast";
  const fq = [], wq = []; let gx = 0, gy = 0;
  const PURE = +(process.env.PURE || 0.15), V3 = !!process.env.V3;
  for (let q = 0; q < 25; q++) { const x = (q % 5) - 2, y = Math.floor(q / 5) - 2; fq[q] = Math.max(0, Math.min(1, dot([cq[q][0] - S[0], cq[q][1] - S[1], cq[q][2] - S[2]], d) / dd));
    if (V3) { const r = ray(x0 + x, y0 + y); const t = r[1] < -1e-5 ? cam[1] / -r[1] : 1e9; if (kq[q] === 1) fq[q] = 1; else if (kq[q] === 2 && aq[q] <= dmin + PURE * (t - dmin)) fq[q] = 0; } wq[q] = Math.exp(-(x * x + y * y) / (2 * SIG * SIG)); if (Math.abs(x) <= 1 && Math.abs(y) <= 1) { gx += x * fq[q]; gy += y * fq[q]; } }
  if (gx * gx + gy * gy < 1e-6) return "grad";
  let th = Math.atan2(gy, gx), n = [Math.cos(th), Math.sin(th)], cc = (fq[12] - 0.5) * (Math.abs(n[0]) + Math.abs(n[1]));
  for (let it = 0; it < 6; it++) { n = [Math.cos(th), Math.sin(th)]; const nt = [-n[1], n[0]]; let j00 = 1e-3, j01 = 0, j11 = 1e-3, r0 = 0, r1 = 0;
    for (let q = 0; q < 25; q++) { const x = (q % 5) - 2, y = Math.floor(q / 5) - 2; const s2 = n[0] * x + n[1] * y + cc; const p = pdf(s2, n); const dth = p * (nt[0] * x + nt[1] * y); const r = cov(s2, n) - fq[q]; const w = wq[q]; j00 += w * dth * dth; j01 += w * dth * p; j11 += w * p * p; r0 += w * dth * r; r1 += w * p * r; }
    const det = j00 * j11 - j01 * j01; th -= Math.max(-0.3, Math.min(0.3, (j11 * r0 - j01 * r1) / det)); cc -= Math.max(-0.5, Math.min(0.5, (j00 * r1 - j01 * r0) / det)); }
  n = [Math.cos(th), Math.sin(th)];
  let res = 0, wsum = 0; for (let q = 0; q < 25; q++) { const x = (q % 5) - 2, y = Math.floor(q / 5) - 2; const e = cov(n[0] * x + n[1] * y + cc, n) - fq[q]; res += wq[q] * e * e; wsum += wq[q]; }
  const rms = Math.sqrt(res / wsum);
  const fmap = fq.map((v) => v.toFixed(2));
  if (rms > RESMAX) return `misfit rms ${rms.toFixed(3)} f=[${fmap.join(" ")}] dmin ${dmin.toFixed(2)} kq ${kq.join("")}`;
  if (Math.abs(cc) >= 0.5 * (Math.abs(n[0]) + Math.abs(n[1])) + 0.1) return `pure(${rms.toFixed(3)})`;
  return `APPLY rms ${rms.toFixed(3)} f ${fq[12].toFixed(2)} -> ${cov(cc, n).toFixed(2)} th ${(th * 180 / Math.PI).toFixed(0)}`;
}
const tally = {};
for (let y = +Y0; y < +Y1; y++) for (let x = +X0; x < +X1; x++) { const r = sil(x, y); const key = r.split(" ")[0]; tally[key] = (tally[key] || 0) + 1; if (process.env.V && key !== "pre") console.log(x, y, r); }
console.log(JSON.stringify(tally));
