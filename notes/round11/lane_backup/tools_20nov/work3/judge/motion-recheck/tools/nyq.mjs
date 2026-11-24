// alternate-frame (1/2-cycle) amplitude of the waterline band's mean |dF| (phase.mjs series), in levels, raw and after a
// centred 9-frame moving-average detrend:  node nyq.mjs MASKSEQ SEQ...
import { loadSeq, bandFromMask } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion/tools/lib.mjs";
const [maskDir, ...dirs] = process.argv.slice(2);
const M = loadSeq(maskDir);
const W = M.W, H = M.H, N = M.n;
const bands = [];
for (let k = 1; k < N; k++) bands.push(bandFromMask(M.mask(k), W, H, 3).band);
for (const d of dirs) {
  const s = loadSeq(d);
  const series = [];
  let prev = s.frame(0);
  for (let k = 1; k < N; k++) {
    const f = s.frame(k), b = bands[k - 1];
    let sum = 0, n = 0;
    for (let i = 0; i < W * H; i++) if (b[i]) { const o = i * 4; sum += Math.max(Math.abs(f[o] - prev[o]), Math.abs(f[o + 1] - prev[o + 1]), Math.abs(f[o + 2] - prev[o + 2])); n++; }
    series.push(n ? sum / n : 0); prev = f;
  }
  const L = series.length, mu = series.reduce((a, b) => a + b, 0) / L;
  let ny = 0; for (let j = 0; j < L; j++) ny += (series[j] - mu) * (j % 2 ? -1 : 1);
  const det = series.map((v, j) => { let a = 0, c = 0; for (let q = Math.max(0, j - 4); q <= Math.min(L - 1, j + 4); q++) { a += series[q]; c++; } return v - a / c; });
  let ny2 = 0; for (let j = 0; j < L; j++) ny2 += det[j] * (j % 2 ? -1 : 1);
  let odd = 0, even = 0; for (let j = 0; j < L; j++) (j % 2 ? (odd += series[j]) : (even += series[j]));
  console.log(d.split("/").pop().padEnd(14), "mean|dF|", mu.toFixed(3), "alt amp raw", (Math.abs(ny) / L).toFixed(4), "detrended", (Math.abs(ny2) / L).toFixed(4), "even/odd mean", (even / Math.ceil(L / 2)).toFixed(3), (odd / Math.floor(L / 2)).toFixed(3));
}
