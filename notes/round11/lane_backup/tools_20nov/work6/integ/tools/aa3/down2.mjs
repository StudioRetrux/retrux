// Downsamples a 2x capture (cap.mjs) to 1x by averaging 2x2 blocks in display space -> same format as cap.mjs
//   node down2.mjs SRC DST
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const [src, dst] = process.argv.slice(2);
fs.mkdirSync(dst, { recursive: true });
const meta = JSON.parse(fs.readFileSync(path.join(src, "meta.json"), "utf8"));
const W = meta.W, H = meta.y1 - meta.y0;
const w = W >> 1, h = H >> 1;
for (let k = 0; k < meta.info.length; k++) {
  const n = `f${String(k).padStart(4, "0")}.bin`;
  const b = zlib.inflateSync(fs.readFileSync(path.join(src, n)));
  const o = Buffer.alloc(w * h * 4);
  // rows stay bottom-up (readPixels order): source rows 2y, 2y+1 -> dest row y (bottom-up both)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 4; c++) {
        const a = ((2 * y) * W + 2 * x) * 4 + c, bq = a + 4, cq = a + W * 4, dq = cq + 4;
        o[(y * w + x) * 4 + c] = (b[a] + b[bq] + b[cq] + b[dq] + 2) >> 2;
      }
  fs.writeFileSync(path.join(dst, n), zlib.deflateSync(o, { level: 1 }));
}
const m2 = { ...meta, W: w, H: meta.H >> 1, y0: meta.y0 >> 1, y1: meta.y1 >> 1, down2: true };
fs.writeFileSync(path.join(dst, "meta.json"), JSON.stringify(m2));
console.log("down2", src, "->", dst, meta.info.length, "frames", w, "x", h);
