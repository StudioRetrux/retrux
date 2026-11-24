// On pixels where X differs from R by > t lv (max channel): mean |R - GT| and |X - GT| (max channel), share of pixels moved toward GT.
//   node towardgt3.mjs X R GT [--t 4] [--k0 0 --k1 N] [--step 1]
import { loadSeq } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const s = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else s.push(loadSeq(argv[i])); }
const [X, R, G] = s; const t = +(opt.t || 4), step = +(opt.step || 1);
const k1 = Math.min(+(opt.k1 || 1e9), X.n, R.n, G.n);
let n = 0, eR = 0, eX = 0, tw = 0;
for (let k = +(opt.k0 || 0); k < k1; k += step) {
  const a = X.frame(k), b = R.frame(k), g = G.frame(k);
  for (let y = 0; y < X.H; y++) for (let x = 0; x < X.W; x++) {
    const i = (y * X.W + x) * 4, ig = ((y + X.y0 - G.y0) * G.W + x) * 4, ir = ((y + X.y0 - R.y0) * R.W + x) * 4;
    const d = Math.max(Math.abs(a[i] - b[ir]), Math.abs(a[i + 1] - b[ir + 1]), Math.abs(a[i + 2] - b[ir + 2]));
    if (d <= t) continue;
    const er = Math.max(Math.abs(b[ir] - g[ig]), Math.abs(b[ir + 1] - g[ig + 1]), Math.abs(b[ir + 2] - g[ig + 2]));
    const ex = Math.max(Math.abs(a[i] - g[ig]), Math.abs(a[i + 1] - g[ig + 1]), Math.abs(a[i + 2] - g[ig + 2]));
    n++; eR += er; eX += ex; if (ex < er) tw++;
  }
}
console.log(`changed px (> ${t} lv): ${n} (${(n / Math.ceil((k1 - (+(opt.k0 || 0))) / step)).toFixed(0)} per frame); |R-GT| ${(eR / n).toFixed(2)} -> |X-GT| ${(eX / n).toFixed(2)}; toward GT ${(100 * tw / n).toFixed(0)} %`);
