// prejudge-glide: real-loop pacing vs band change: per frame dt (engine) and mean |dF| over the captured box pixels; correlation and
// the 1/8.5-cycle component of dt itself.   node rlpace.mjs SEQ
import { loadSeq } from "./lib.mjs";
const S = loadSeq(process.argv[2]);
const W = S.W, H = S.H, n = S.n;
const dF = [], dt = [];
for (let k = 1; k < n; k++) {
  const f = S.frame(k), p = S.frame(k - 1);
  let s = 0, c = 0;
  for (let i = 0; i < W * H; i++) { const q = i * 4; if (!f[q + 3]) continue; s += Math.max(Math.abs(f[q] - p[q]), Math.abs(f[q + 1] - p[q + 1]), Math.abs(f[q + 2] - p[q + 2])); c++; }
  dF.push(s / c); dt.push(S.meta.info[k].t - S.meta.info[k - 1].t);
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const mf = mean(dF), mt = mean(dt);
let sxy = 0, sxx = 0, syy = 0;
for (let i = 0; i < dF.length; i++) { sxy += (dF[i] - mf) * (dt[i] - mt); sxx += (dF[i] - mf) ** 2; syy += (dt[i] - mt) ** 2; }
const spec = (a) => { const m = mean(a), L = a.length, out = []; for (let f = 1; f < L / 2; f++) { let re = 0, im = 0; for (let j = 0; j < L; j++) { re += (a[j] - m) * Math.cos((2 * Math.PI * f * j) / L); im -= (a[j] - m) * Math.sin((2 * Math.PI * f * j) / L); } out.push(Math.hypot(re, im)); } return out; };
const sd = spec(dt), sf = spec(dF);
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const pk = (a) => { let b = 0; for (let i = 0; i < a.length; i++) if (a[i] > a[b]) b = i; return `${(a[b] / med(a)).toFixed(1)}x @ ${((b + 1) / (a.length * 2 + 1)).toFixed(3)}`; };
console.log(`${process.argv[2].split("/").pop()}: corr(|dF|, dt) = ${(sxy / Math.sqrt(sxx * syy)).toFixed(2)}; dt peak ${pk(sd)}; |dF| peak ${pk(sf)}; dt ms min/med/max ${Math.min(...dt).toFixed(0)}/${med(dt).toFixed(0)}/${Math.max(...dt).toFixed(0)}`);
