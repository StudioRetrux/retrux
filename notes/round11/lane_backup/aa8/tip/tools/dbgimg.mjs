// debug images for one frame: node dbgimg.mjs DIR k zoom OUT.png
// panels (left to right): final | cF luma before guard | cF luma after guard | gFt | front row depth behind X (green: within 0.3 m = face, red: behind)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png } from "./lib.mjs";
const [dir, k, zoom, out, sub] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(dir, "dbg.json")));
const fr = meta.frames.find((f) => f.k === +k);
const kk = `k${String(+k).padStart(4, "0")}`;
const ld = (name, f32) => { const b = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_${name}.bin`))); return f32 ? new Float32Array(b.buffer, b.byteOffset, b.length / 4) : new Uint8Array(b); };
const fin = ld("final", false);
const [w, h] = fr.dims.final;
const M = {}; for (const m of meta.modes) M[m] = ld("m" + m, true);
const [cx0, cy0] = meta.crop;
const [sx0, sy0, sx1, sy1] = sub ? sub.split(",").map(Number) : [cx0, cy0, cx0 + w, cy0 + h];
const ow = sx1 - sx0, oh = sy1 - sy0;
const P = 5, gap = 2, W = ow, HH = P * oh + (P - 1) * gap;
const img = new Uint8Array(W * HH * 4).fill(255);
const put = (p, x, y, r, g, b) => { x -= sx0 - cx0; y -= sy0 - cy0; if (x < 0 || y < 0 || x >= ow || y >= oh) return; const o = ((p * (oh + gap) + y) * W + x) * 4; img[o] = r; img[o + 1] = g; img[o + 2] = b; img[o + 3] = 255; };
const tm = (v) => Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.max(v, 0) / 2.0, 1 / 2.2))));
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = y * w + x, j = i * 4;
  put(0, x, y, fin[j], fin[j + 1], fin[j + 2]);
  const G = M[12].subarray(j, j + 4), R = M[13].subarray(j, j + 4), S = M[14].subarray(j, j + 4);
  const water = G[3] >= 0 && G[3] <= 1.01 && G[0] >= 0;
  if (!water) { for (let p = 1; p < 5; p++) put(p, x, y, 40, 0, 40); continue; }
  put(1, x, y, tm(S[0]), tm(S[0]), tm(S[0]));
  const after = S[1] < 0 ? S[0] : S[1];
  put(2, x, y, tm(after), tm(after), tm(after));
  put(3, x, y, Math.round(255 * G[0]), Math.round(255 * Math.min(1, G[1] / 3)), Math.round(255 * Math.min(1, G[2] / 3)));
  const front = Math.min(R[2], R[3]);
  const c = front < -0.3 ? [0, 0, 255] : front < 0.3 ? [0, 200, 0] : front < 8 ? [255, 160, 0] : [255, 0, 0];
  put(4, x, y, c[0], c[1], c[2]);
}
png(img, W, HH, out, { zoom: +zoom });
console.log("wrote", out);
