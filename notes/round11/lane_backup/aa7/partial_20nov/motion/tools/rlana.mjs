// Real-loop G6: per box, s_k = mean max-channel |F_k - F_k-1| over (a) the union waterline band of the stepped BASE masks of the
// same path (anywhere the waterline was, +-3 px) and (b) all box pixels; spectrum as judge.mjs; also mean s on mirror-redraw
// frames vs others (info.mirror) and grouped by the redraw phase (frames since the last redraw).
//   node rlana.mjs --mask STEPPED_MASKSEQ SEQ1 SEQ2 ...
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const M = loadSeq(opt.mask); const W = M.W, H = M.H, Y0 = M.y0;
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const names = Object.keys(BOXES);
const uni = new Uint8Array(W * H);
for (let k = 0; k < M.n; k += 3) { const { band } = bandFromMask(M.mask(k), W, H, 3); for (let i = 0; i < band.length; i++) if (band[i]) uni[i] = 1; }
const boxOf = new Int8Array(W * H).fill(-1);
names.forEach((n, bi) => { const [x0, y0, x1, y1] = BOXES[n]; for (let y = Math.max(0, y0 - Y0); y < Math.min(H, y1 - Y0); y++) for (let x = x0; x < x1; x++) if (boxOf[y * W + x] < 0) boxOf[y * W + x] = bi; });
function spectrum(s) {
  const L = s.length, h = 4, d = s.map((x, j) => { let a = 0, n = 0; for (let t = Math.max(0, j - h); t <= Math.min(L - 1, j + h); t++) { a += s[t]; n++; } return x - a / n; });
  const mags = []; for (let f = 1; f <= Math.floor(L / 2); f++) { let re = 0, im = 0; for (let j = 0; j < L; j++) { re += d[j] * Math.cos((2 * Math.PI * f * j) / L); im -= d[j] * Math.sin((2 * Math.PI * f * j) / L); } mags.push(Math.hypot(re, im)); }
  const fr = (b) => (b + 1) / L; const floor = mags.filter((_, b) => fr(b) >= 0.05).sort((a, b) => a - b); const med = floor[floor.length >> 1] || 1e-9;
  const at = (f) => { const b = Math.round(f * L) - 1; return Math.max(mags[b - 1] ?? 0, mags[b] ?? 0, mags[b + 1] ?? 0) / med; };
  let pk = 0, pf = 0; mags.forEach((m, b) => { if (fr(b) >= 0.1 && m / med > pk) { pk = m / med; pf = fr(b); } });
  return `1/2 ${at(0.5).toFixed(1)} 1/3 ${at(1 / 3).toFixed(1)} 1/4 ${at(0.25).toFixed(1)} 1/8 ${at(0.125).toFixed(1)} peak ${pk.toFixed(1)}@${pf.toFixed(3)}`;
}
for (const q of seqs) {
  const info = q.meta.info; const n = q.n;
  const ser = { U: names.map(() => []), A: names.map(() => []) }, all = { U: [], A: [] };
  for (let k = 1; k < n; k++) {
    const F = q.frame(k), P = q.frame(k - 1); const acc = names.map(() => [0, 0, 0, 0]); let u = [0, 0], a = [0, 0];
    for (let i = 0; i < W * H; i++) { const bi = boxOf[i]; if (bi < 0) continue; const p = i * 4; const d = Math.max(Math.abs(F[p] - P[p]), Math.abs(F[p + 1] - P[p + 1]), Math.abs(F[p + 2] - P[p + 2])); acc[bi][2] += d; acc[bi][3]++; a[0] += d; a[1]++; if (uni[i]) { acc[bi][0] += d; acc[bi][1]++; u[0] += d; u[1]++; } }
    names.forEach((_, bi) => { ser.U[bi].push(acc[bi][0] / Math.max(1, acc[bi][1])); ser.A[bi].push(acc[bi][2] / Math.max(1, acc[bi][3])); });
    all.U.push(u[0] / u[1]); all.A.push(a[0] / a[1]);
  }
  const dts = info.slice(1).map((x, i) => x.t - info[i].t).sort((x, y) => x - y);
  const mir = info.filter((x) => x.mirror > 0).length;
  // redraw phase: frames since the last mirror redraw (0 = redrawn this frame)
  const ph = []; let last = -99; for (let k = 0; k < n; k++) { if (info[k].mirror > 0) last = k; ph.push(Math.min(3, k - last)); }
  const byPh = [[], [], [], []]; for (let k = 1; k < n; k++) byPh[ph[k]].push(all.U[k - 1]);
  const mean = (x) => x.reduce((s, v) => s + v, 0) / Math.max(1, x.length);
  const taa = info.filter((x) => x.taa && x.taa.weight > 0).length;
  console.log(`${q.dir.split("/").slice(-2).join("/")}: ${n} frames, frame ms med ${dts[dts.length >> 1].toFixed(1)} p90 ${dts[Math.floor(dts.length * 0.9)].toFixed(1)} max ${dts[dts.length - 1].toFixed(1)}; mirror redraw frames ${mir}/${n}; taa active ${taa}; W ${[...new Set(info.map((x) => x.W))]} scale ${[...new Set(info.map((x) => x.scale))]}`);
  console.log(`  union band, by redraw phase (0 = redrawn this frame): ${byPh.map((x) => (x.length ? mean(x).toFixed(2) + " (" + x.length + ")" : "-")).join(" | ")}`);
  const fold = (x, P) => { const g = Array.from({ length: P }, () => [0, 0]); x.forEach((v, j) => { g[(j + 1) % P][0] += v; g[(j + 1) % P][1]++; }); const m = g.map((a) => a[0] / a[1]); return (Math.max(...m) - Math.min(...m)).toFixed(3); };
  console.log(`  folded amplitude (lv) ALL band: P2 ${fold(all.U, 2)} P3 ${fold(all.U, 3)} P4 ${fold(all.U, 4)} P6 ${fold(all.U, 6)} P8 ${fold(all.U, 8)}; mean ${mean(all.U).toFixed(2)}`);
  console.log(`  ALL  band: ${spectrum(all.U)}  | box: ${spectrum(all.A)}`);
  names.forEach((nm, bi) => console.log(`  ${nm.padEnd(4)} band: ${spectrum(ser.U[bi])}  | box: ${spectrum(ser.A[bi])}`));
}
