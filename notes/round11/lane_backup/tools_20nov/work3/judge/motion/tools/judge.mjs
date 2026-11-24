// Judge (motion lens): G1b edge error vs GT + edge MCE, and G6 periodic components of the waterline band's frame-to-frame change.
//   node judge.mjs --mask MASKSEQ --seq NAME=DIR ... [--gt NAME] [--ref NAME] [--out FILE.json] [--nomask-band UNIONFILE]
// EDGE px (G1b): 3x3 holds lake (mask bit0) AND solid (no bit0/bit1), hero dilated 6 px excluded, inside the six boxes.
// BAND px (G6): lake/solid boundary +-3 px (lib.bandFromMask), hero excluded.
// G6 per box: s_k = mean max-channel |F_k - F_k-1| over band px; detrended by a centred 9-frame moving average;
//   DFT magnitude at every bin; ratio = |X(f)| / median |X| over f in [0.05, 0.5]; reported at 1/2, 1/3, 1/4, 1/6, 1/8 and
//   the largest ratio above f = 0.1 (frequency printed). Folded amplitude: (max - min) / mean of s grouped by k mod 3.
import fs from "node:fs";
import { loadSeq, bandFromMask, dilate } from "./lib.mjs";
const argv = process.argv.slice(2);
const seqs = []; let maskDir, gtName = null, refName = null, outFile = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--mask") maskDir = argv[++i];
  else if (a === "--seq") { const [n, d] = argv[++i].split("="); seqs.push({ name: n, s: loadSeq(d) }); }
  else if (a === "--gt") gtName = argv[++i];
  else if (a === "--ref") refName = argv[++i];
  else if (a === "--out") outFile = argv[++i];
}
const M = loadSeq(maskDir); const W = M.W, H = M.H, Y0 = M.y0;
const ref = seqs.find((q) => q.name === (refName ?? seqs[0].name));
const N = Math.min(M.n, ...seqs.map((q) => q.s.n));
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const names = Object.keys(BOXES);
const boxOf = new Int8Array(W * H).fill(-1);
names.forEach((n, bi) => { const [x0, y0, x1, y1] = BOXES[n]; for (let y = Math.max(0, y0 - Y0); y < Math.min(H, y1 - Y0); y++) for (let x = x0; x < x1; x++) if (boxOf[y * W + x] < 0) boxOf[y * W + x] = bi; });
const cr = (t) => { const t2 = t * t, t3 = t2 * t; return [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2]; };
function sampleRGB(f, x, y, out) { const xi = Math.floor(x), yi = Math.floor(y); const wx = cr(x - xi), wy = cr(y - yi); out[0] = out[1] = out[2] = 0; for (let j = 0; j < 4; j++) { const yy = Math.min(H - 1, Math.max(0, yi - 1 + j)); for (let i = 0; i < 4; i++) { const xx = Math.min(W - 1, Math.max(0, xi - 1 + i)); const w = wx[i] * wy[j], p = (yy * W + xx) * 4; out[0] += w * f[p]; out[1] += w * f[p + 1]; out[2] += w * f[p + 2]; } } }
const lumaImg = (f) => { const o = new Float32Array(W * H); for (let i = 0; i < o.length; i++) o[i] = 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2]; return o; };
function register(A, B, b, R = 14) {
  const [x0, y0a, x1, y1a] = b; const y0 = Math.max(0, y0a - Y0), y1 = Math.min(H, y1a - Y0);
  const xs = Math.max(x0, R + 2), xe = Math.min(x1, W - R - 2), ys = Math.max(y0, 6), ye = Math.min(y1, H - 6);
  if (xe - xs < 8 || ye - ys < 8) return [0, 0];
  const ssd = (dx, dy) => { let s = 0; for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) { const d = B[y * W + x] - A[(y - dy) * W + (x - dx)]; s += d * d; } return s; };
  let best = [0, 0], bs = Infinity;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -R; dx <= R; dx++) { const s = ssd(dx, dy); if (s < bs) { bs = s; best = [dx, dy]; } }
  const [bx, by] = best; const fx = (a, c, d) => { const den = a - 2 * c + d; return den > 1e-9 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - d)) / den)) : 0; };
  return [bx + fx(ssd(bx - 1, by), bs, ssd(bx + 1, by)), by + fx(ssd(bx, by - 1), bs, ssd(bx, by + 1))];
}
const R = {}; for (const q of seqs) R[q.name] = { eg: names.map(() => [0, 0, 0]), mce: names.map(() => [0, 0, 0]), series: names.map(() => []), seriesAll: [] };
const tmp = [0, 0, 0];
for (let k = 1; k < N; k++) {
  const m = M.mask(k);
  const { band, lake, solid, hero } = bandFromMask(m, W, H, 3);
  // edge px: 3x3 has lake and solid
  const edge = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; if (hero[i] || boxOf[i] < 0) continue;
    let hl = 0, hs = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * W + dx; if (lake[j]) hl = 1; if (solid[j]) hs = 1; }
    if (hl && hs) edge[i] = 1;
  }
  const RL = lumaImg(ref.s.frame(k)), RP = lumaImg(ref.s.frame(k - 1));
  const v = names.map((n) => register(RP, RL, BOXES[n]));
  const G = gtName ? seqs.find((q) => q.name === gtName).s.frame(k) : null;
  for (const q of seqs) {
    const r = R[q.name], F = q.s.frame(k), P = q.s.frame(k - 1);
    const acc = names.map(() => [0, 0]);
    let aAll = 0, nAll = 0;
    for (let i = 0; i < W * H; i++) {
      const bi = boxOf[i]; if (bi < 0) continue;
      const p = i * 4;
      if (band[i]) {
        const d = Math.max(Math.abs(F[p] - P[p]), Math.abs(F[p + 1] - P[p + 1]), Math.abs(F[p + 2] - P[p + 2]));
        acc[bi][0] += d; acc[bi][1]++; aAll += d; nAll++;
      }
      if (!edge[i]) continue;
      if (G) { const e = Math.max(Math.abs(F[p] - G[p]), Math.abs(F[p + 1] - G[p + 1]), Math.abs(F[p + 2] - G[p + 2])); r.eg[bi][0] += e; r.eg[bi][1] += e * e; r.eg[bi][2]++; }
      const x = i % W, y = (i / W) | 0; const sx = x - v[bi][0], sy = y - v[bi][1];
      if (sx >= 1 && sx < W - 2 && sy >= 1 && sy < H - 2) { sampleRGB(P, sx, sy, tmp); const e = Math.max(Math.abs(F[p] - tmp[0]), Math.abs(F[p + 1] - tmp[1]), Math.abs(F[p + 2] - tmp[2])); r.mce[bi][0] += e; r.mce[bi][1] += e > 32 ? 1 : 0; r.mce[bi][2]++; }
    }
    names.forEach((n, bi) => r.series[bi].push(acc[bi][1] ? acc[bi][0] / acc[bi][1] : 0));
    r.seriesAll.push(nAll ? aAll / nAll : 0);
  }
}
function spectrum(s) {
  const L = s.length, h = 4, d = s.map((x, j) => { let a = 0, n = 0; for (let t = Math.max(0, j - h); t <= Math.min(L - 1, j + h); t++) { a += s[t]; n++; } return x - a / n; });
  const mags = []; for (let f = 1; f <= Math.floor(L / 2); f++) { let re = 0, im = 0; for (let j = 0; j < L; j++) { re += d[j] * Math.cos((2 * Math.PI * f * j) / L); im -= d[j] * Math.sin((2 * Math.PI * f * j) / L); } mags.push(Math.hypot(re, im)); }
  const fr = (b) => (b + 1) / L;
  const floor = mags.filter((_, b) => fr(b) >= 0.05).sort((a, b) => a - b); const med = floor[floor.length >> 1] || 1e-9;
  const at = (f) => { const b = Math.round(f * L) - 1; return Math.max(mags[b - 1] ?? 0, mags[b] ?? 0, mags[b + 1] ?? 0) / med; };
  let pk = 0, pf = 0; mags.forEach((m, b) => { if (fr(b) >= 0.1 && m / med > pk) { pk = m / med; pf = fr(b); } });
  const fold = [0, 0, 0], fn = [0, 0, 0]; s.forEach((x, j) => { fold[(j + 1) % 3] += x; fn[(j + 1) % 3]++; }); const fm = fold.map((x, i) => x / fn[i]); const mu = s.reduce((a, b) => a + b, 0) / L;
  return { f2: +at(0.5).toFixed(1), f3: +at(1 / 3).toFixed(1), f4: +at(0.25).toFixed(1), f6: +at(1 / 6).toFixed(1), f8: +at(1 / 8).toFixed(1), peak: +pk.toFixed(1), peakF: +pf.toFixed(3), fold3: +((Math.max(...fm) - Math.min(...fm)) / mu).toFixed(3) };
}
const out = { frames: N - 1, gt: gtName, res: {} };
const pad = (s, n = 12) => String(s).padStart(n);
console.log(`frames ${N - 1}` + (gtName ? `, GT ${gtName}` : ""));
for (const q of seqs) {
  const r = R[q.name]; const o = { box: {}, tot: {} };
  let t = [0, 0, 0], tm = [0, 0, 0];
  names.forEach((n, bi) => { const e = r.eg[bi], m = r.mce[bi]; o.box[n] = { edgePx: m[2], eg: e[2] ? +(e[0] / e[2]).toFixed(3) : null, egRms: e[2] ? +Math.sqrt(e[1] / e[2]).toFixed(3) : null, mceEdge: m[2] ? +(m[0] / m[2]).toFixed(3) : null, mc32Edge: m[2] ? +((1000 * m[1]) / m[2]).toFixed(2) : null, g6: spectrum(r.series[bi]) }; for (let j = 0; j < 3; j++) { t[j] += e[j]; tm[j] += m[j]; } });
  o.tot = { edgePx: tm[2], eg: t[2] ? +(t[0] / t[2]).toFixed(3) : null, egRms: t[2] ? +Math.sqrt(t[1] / t[2]).toFixed(3) : null, mceEdge: +(tm[0] / tm[2]).toFixed(3), mc32Edge: +((1000 * tm[1]) / tm[2]).toFixed(2), g6: spectrum(r.seriesAll) };
  o.series = { ALL: r.seriesAll, ...Object.fromEntries(names.map((n, bi) => [n, r.series[bi]])) };
  out.res[q.name] = o;
  console.log(`== ${q.name}`);
  for (const n of [...names, "tot"]) { const b = n === "tot" ? o.tot : o.box[n]; console.log(`  ${n.padEnd(4)} edgePx ${pad(b.edgePx, 8)} eg ${pad(b.eg, 7)} rms ${pad(b.egRms, 7)} mceE ${pad(b.mceEdge, 7)} mc32E ${pad(b.mc32Edge, 7)} | G6 1/2 ${pad(b.g6.f2, 5)} 1/3 ${pad(b.g6.f3, 5)} 1/4 ${pad(b.g6.f4, 5)} 1/6 ${pad(b.g6.f6, 5)} 1/8 ${pad(b.g6.f8, 5)} peak ${pad(b.g6.peak, 5)}@${b.g6.peakF} fold3 ${b.g6.fold3}`); }
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out));
