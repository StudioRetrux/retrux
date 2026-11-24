// signed luma difference maps: node sdiff.mjs --crop x0,y0,x1,y1 --k K --gain 6 --zoom 4 --out F A B [C D ...]  -> (B-A), (C-A), ... red = brighter
import { loadSeq, png, hstack, cropRGBA, luma8 } from "./lib.mjs";
const a = process.argv.slice(2); const o = {}; const seqs = [];
for (let i = 0; i < a.length; i++) { if (a[i].startsWith("--")) o[a[i].slice(2)] = a[++i]; else seqs.push(loadSeq(a[i])); }
const [x0, y0, x1, y1] = o.crop.split(",").map(Number); const k = +o.k; const g = +(o.gain || 6);
const A = seqs[0]; const w = x1 - x0, h = y1 - y0;
const ca = cropRGBA(A.frame(k), A.W, [x0, y0 - A.y0, x1, y1 - A.y0]);
const imgs = [ca];
for (const s of seqs.slice(1)) {
  const cb = cropRGBA(s.frame(k), s.W, [x0, y0 - s.y0, x1, y1 - s.y0]);
  const d = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = luma8(cb[i * 4], cb[i * 4 + 1], cb[i * 4 + 2]) - luma8(ca[i * 4], ca[i * 4 + 1], ca[i * 4 + 2]);
    const m = Math.min(255, Math.abs(v) * g);
    d[i * 4] = v > 0 ? 128 + m / 2 : 128 - m / 2; d[i * 4 + 1] = 128 - m / 2; d[i * 4 + 2] = v < 0 ? 128 + m / 2 : 128 - m / 2; d[i * 4 + 3] = 255;
  }
  imgs.push(d);
}
const st = hstack(imgs, w, h, 4); png(st.img, st.W, st.H, o.out, { zoom: +(o.zoom || 4) }); console.log("wrote", o.out);
