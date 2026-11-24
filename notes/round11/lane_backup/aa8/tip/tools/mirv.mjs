// mirror target dump: node mirv.mjs DIR k c0 c1 r0 r1 dref [png zoom]
// prints rows r1..r0 (top-down in the world = decreasing row index? we print descending row index) of luma and (a - dref)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png } from "./lib.mjs";
const [dir, k, c0, c1, r0, r1, dref, out, zoom] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(dir, "dbg.json")));
const fr = meta.frames.find((f) => f.k === +k);
const kk = `k${String(+k).padStart(4, "0")}`;
const b = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_mirror.bin`)));
const M = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
const [mw, mh] = fr.dims.mirror;
const at = (c, r) => M.subarray((r * mw + c) * 4, (r * mw + c) * 4 + 4); // readPixels rows bottom-up: row index = uv.y * h
let s = "row  " + Array.from({ length: +c1 - +c0 + 1 }, (_, i) => String(+c0 + i).padStart(10)).join("");
console.log(s);
for (let r = +r1; r >= +r0; r--) {
  let line = String(r).padStart(4) + " ";
  for (let c = +c0; c <= +c1; c++) { const v = at(c, r); const L = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; const a = v[3] - +dref; line += `${L.toFixed(2)}/${a > 99 ? " far" : a.toFixed(1).padStart(4)}`.padStart(10); }
  console.log(line);
}
if (out) {
  const w = +c1 - +c0 + 1, h = +r1 - +r0 + 1, gap = 2, W = 2 * w + gap;
  const img = new Uint8Array(W * h * 4).fill(255);
  const tm = (v) => Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.max(v, 0) / 2.0, 1 / 2.2))));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = at(+c0 + x, +r1 - y);
    let o = (y * W + x) * 4; img[o] = tm(v[0]); img[o + 1] = tm(v[1]); img[o + 2] = tm(v[2]);
    const a = v[3] - +dref; const c = a < -0.3 ? [0, 0, 255] : a < 0.3 ? [0, 200, 0] : a < 1.5 ? [255, 160, 0] : a < 8 ? [200, 80, 0] : [255, 0, 0];
    o = (y * W + w + gap + x) * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
  }
  png(img, W, h, out, { zoom: +(zoom || 8) });
}
