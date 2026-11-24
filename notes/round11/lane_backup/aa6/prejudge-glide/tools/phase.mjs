// Periodic (mirror-cadence) component on the waterline band: per frame, the band's mean |dF| and count > T per box,
// grouped by whether the lake mirror was redrawn on this frame (cap meta info.mirror) and by k mod 3; plus the DFT
// magnitude of the per-frame band flicker at 1/3 cycle per frame relative to the mean spectrum level (|X(f)| / median |X|).
//   node phase.mjs --mask MASKSEQ SEQ1 [SEQ2 ...] [--box RS] [--t 16]
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2);
const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const M = loadSeq(opt.mask);
const W = M.W, H = M.H, Y0 = M.y0;
const BOX = { RF: [950, 638, 1440, 664], RS: [940, 590, 1440, 655], FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], ALL: [0, 380, 1440, 766] };
const names = (opt.box || "RS,WR,FS,DR,FF,FR,ALL").split(",");
const T = +(opt.t || 16);
const N = Math.min(M.n, ...seqs.map((s) => s.n));
const bands = [];
for (let k = 1; k < N; k++) bands.push(bandFromMask(M.mask(k), W, H, 3).band);
for (const s of seqs) {
  const out = [];
  for (const bn of names) {
    const [x0, y0a, x1, y1a] = BOX[bn];
    const y0 = Math.max(0, y0a - Y0), y1 = Math.min(H, y1a - Y0);
    const series = [], cnt = [];
    for (let k = 1; k < N; k++) {
      const F = s.frame(k), P = s.frame(k - 1), band = bands[k - 1];
      let sum = 0, n = 0, c = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * W + x;
        if (!band[i]) continue;
        const p = i * 4;
        const d = Math.max(Math.abs(F[p] - P[p]), Math.abs(F[p + 1] - P[p + 1]), Math.abs(F[p + 2] - P[p + 2]));
        sum += d; n++; if (d > T) c++;
      }
      series.push(n ? sum / n : 0); cnt.push(c);
    }
    // by mirror redraw (frame k's mirror flag) and k mod 3
    const red = [], other = [];
    const ph = [[], [], []];
    for (let j = 0; j < series.length; j++) {
      const k = j + 1;
      (s.meta.info[k].mirror ? red : other).push(series[j]);
      ph[k % 3].push(cnt[j]);
    }
    const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    // DFT of the (detrended) series
    const L = series.length, mu = mean(series);
    const mags = [];
    for (let f = 1; f < L / 2; f++) { let re = 0, im = 0; for (let j = 0; j < L; j++) { re += (series[j] - mu) * Math.cos((2 * Math.PI * f * j) / L); im -= (series[j] - mu) * Math.sin((2 * Math.PI * f * j) / L); } mags.push(Math.hypot(re, im)); }
    const f3 = Math.round(L / 3) - 1;
    const sorted = [...mags].sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    const peak = Math.max(mags[f3 - 1] ?? 0, mags[f3], mags[f3 + 1] ?? 0);
    // the 1/2-cycle (Nyquist) component: alternate-frame sign flips
    let ny = 0;
    for (let j = 0; j < L; j++) ny += (series[j] - mu) * (j % 2 ? -1 : 1);
    const peak2 = Math.max(Math.abs(ny), mags[mags.length - 1] ?? 0, mags[mags.length - 2] ?? 0);
    const ph2 = [0, 0];
    for (let j = 0; j < cnt.length; j++) ph2[(j + 1) % 2] += cnt[j];
    out.push(`${bn}: redraw ${mean(red).toFixed(2)} other ${mean(other).toFixed(2)} | cnt>${T} by k%3 ${ph.map((a) => a.reduce((x, y) => x + y, 0)).join("/")} k%2 ${ph2.join("/")} | f=1/3: ${(peak / med).toFixed(1)}x, f=1/2: ${(peak2 / med).toFixed(1)}x median`);
  }
  console.log(s.dir.split("/").pop() + "\n  " + out.join("\n  "));
}
