// refcmp.mjs A B R [--k0 --k1 --thr 4 --box x0,y0,x1,y1 --worse 8]: on px where |luma(B) - luma(A)| > thr: mean |A - R| vs
// |B - R| (luma), px where B is closer / farther; px where B is farther from R than A by > worse lv, with per-frame bboxes.
import { loadSeq } from "./lib.mjs";
const argv = process.argv.slice(2); const [a, b, r] = argv; const opt = {};
for (let i = 3; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
const A = loadSeq(a), B = loadSeq(b), R = loadSeq(r); const W = A.W, H = A.H, Y0 = A.y0;
const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), A.n, B.n, R.n), thr = +(opt.thr || 4), worse = +(opt.worse || 8);
const box = (opt.box || `0,${Y0},${W},${Y0 + H}`).split(",").map(Number);
const L = (f, i) => 0.2126 * f[i] + 0.7152 * f[i + 1] + 0.0722 * f[i + 2];
let n = 0, ea = 0, eb = 0, closer = 0, farther = 0, nw = 0; const wf = [];
for (let k = k0; k < k1; k++) {
  const fa = A.frame(k), fb = B.frame(k), fr = R.frame(k); let wk = 0, bb = [1e9, 1e9, -1, -1];
  for (let y = Math.max(box[1], Y0); y < Math.min(box[3], Y0 + H); y++) for (let x = box[0]; x < box[2]; x++) {
    const i = ((y - Y0) * W + x) * 4; const la = L(fa, i), lb = L(fb, i), lr = L(fr, i);
    if (Math.abs(lb - la) <= thr) continue;
    n++; const da = Math.abs(la - lr), db = Math.abs(lb - lr); ea += da; eb += db; if (db < da) closer++; else farther++;
    if (db - da > worse) { nw++; wk++; bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)]; }
  }
  if (wk) wf.push(`k${k}:${wk}px x${bb[0]}-${bb[2]} y${bb[1]}-${bb[3]}`);
}
console.log(`${b.split("/").pop()} vs ${a.split("/").pop()} ref ${r.split("/").pop()} k${k0}-${k1 - 1} thr ${thr}: changed ${n} px; mean |A-R| ${(ea / Math.max(n, 1)).toFixed(2)} -> |B-R| ${(eb / Math.max(n, 1)).toFixed(2)}; B closer ${closer}, farther ${farther}; farther by > ${worse} lv: ${nw} px`);
if (opt.list) console.log(wf.slice(0, +opt.list).join("\n"));
