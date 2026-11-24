// mask visual: frame | old mask | new mask | coverage, crop (full-frame coords), zoomed
//   node maskviz.mjs --old OLDSEQ --new NEWSEQ --k K --crop x0,y0,x1,y1 --zoom 3 --out FILE
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
import { loadSeq, png, hstack, cropRGBA } from "./lib.mjs";
const a = process.argv.slice(2); const o = {}; for (let i = 0; i < a.length; i += 2) o[a[i].slice(2)] = a[i + 1];
const A = loadSeq(o.old), B = loadSeq(o.new); const k = +o.k; const [x0, y0, x1, y1] = o.crop.split(",").map(Number);
const W = B.W, H = B.H;
const mimg = (m) => { const r = new Uint8Array(W * H * 4); for (let i = 0; i < m.length; i++) { const v = m[i] & 1 ? 255 : m[i] & 2 ? 128 : 0; r[i*4] = v; r[i*4+1] = v; r[i*4+2] = m[i] & 4 ? 255 : v; r[i*4+3] = 255; } return r; };
const cb = zlib.inflateSync(fs.readFileSync(path.join(o.new, `c${String(k).padStart(4, "0")}.bin`)));
const rowB = W; const cov = new Uint8Array(W * H); for (let y = 0; y < H; y++) cov.set(cb.subarray((H - 1 - y) * rowB, (H - y) * rowB), y * W);
const cimg = new Uint8Array(W * H * 4); for (let i = 0; i < cov.length; i++) { cimg[i*4] = cimg[i*4+1] = cimg[i*4+2] = cov[i]; cimg[i*4+3] = 255; }
const cr = (img) => cropRGBA(img, W, [x0, y0 - B.y0, x1, y1 - B.y0]);
const st = hstack([cr(B.frame(k)), cr(mimg(A.mask(k))), cr(mimg(B.mask(k))), cr(cimg)], x1 - x0, y1 - y0, 4);
png(st.img, st.W, st.H, o.out, { zoom: +(o.zoom || 3) });
console.log("wrote", o.out);
