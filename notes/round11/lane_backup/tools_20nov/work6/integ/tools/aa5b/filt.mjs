// Offline prototype of an edge-targeted AA on the lake / solid boundary (display space approximation):
//   node filt.mjs --mask MASKSEQ --in SEQ --out DIR --f gauss:0.6 | tang:5 | tang3 | mix:0.6  [--k1 N]
// The filtered pixels: those whose 3x3 in the mask holds both lake (bit0|bit1) and solid; everything else is copied.
// Output: a cap.mjs-format sequence (rows bottom-up, zlib) so crawl.mjs / slice.mjs read it.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { loadSeq } from "./lib.mjs";

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].slice(2)] = argv[i + 1];
const M = loadSeq(opt.mask), S = loadSeq(opt.in);
const W = S.W, H = S.H;
const [kind, parm] = opt.f.split(":");
fs.mkdirSync(opt.out, { recursive: true });
const N = Math.min(S.n, M.n, +(opt.k1 || 1e9));
const sig = +(parm || 0.6);
const ge = Math.exp(-1 / (2 * sig * sig)), gd = Math.exp(-2 / (2 * sig * sig));
const lum = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
function bil(f, x, y, c) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const x0 = Math.min(W - 1, Math.max(0, xi)), x1 = Math.min(W - 1, Math.max(0, xi + 1)), y0 = Math.min(H - 1, Math.max(0, yi)), y1 = Math.min(H - 1, Math.max(0, yi + 1));
  const a = f[(y0 * W + x0) * 4 + c], b = f[(y0 * W + x1) * 4 + c], cc = f[(y1 * W + x0) * 4 + c], d = f[(y1 * W + x1) * 4 + c];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy;
}
for (let k = 0; k < N; k++) {
  const f = S.frame(k), m = M.mask(k);
  const o = new Uint8Array(f);
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) {
      const i = y * W + x;
      let hasL = false, hasS = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const v = m[i + dy * W + dx];
        if (v & 3) hasL = true;
        else hasS = true;
      }
      if (!(hasL && hasS) || m[i] & 4) continue;
      const p = i * 4;
      if (kind === "gauss") {
        for (let c = 0; c < 3; c++) {
          const s = f[p + c] + ge * (f[p - 4 + c] + f[p + 4 + c] + f[p - W * 4 + c] + f[p + W * 4 + c]) + gd * (f[p - W * 4 - 4 + c] + f[p - W * 4 + 4 + c] + f[p + W * 4 - 4 + c] + f[p + W * 4 + 4 + c]);
          o[p + c] = Math.round(s / (1 + 4 * ge + 4 * gd));
        }
      } else if (kind === "tang" || kind === "tang3" || kind === "mix") {
        // Sobel on luma
        const L = (dx, dy) => lum(f, i + dy * W + dx);
        const gx = L(1, -1) + 2 * L(1, 0) + L(1, 1) - L(-1, -1) - 2 * L(-1, 0) - L(-1, 1);
        const gy = L(-1, 1) + 2 * L(0, 1) + L(1, 1) - L(-1, -1) - 2 * L(0, -1) - L(1, -1);
        const gl = Math.hypot(gx, gy);
        if (gl < 8) continue;
        const tx = -gy / gl, ty = gx / gl;
        const taps = kind === "tang3" ? [[0, 0.5], [1, 0.25], [-1, 0.25]] : [[0, 0.4], [1, 0.2], [-1, 0.2], [2, 0.1], [-2, 0.1]];
        for (let c = 0; c < 3; c++) {
          let mn = 255, mx = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const v = f[(i + dy * W + dx) * 4 + c];
            if (v < mn) mn = v;
            if (v > mx) mx = v;
          }
          let s = 0;
          for (const [t, w] of taps) s += w * bil(f, x + tx * t, y + ty * t, c);
          if (kind === "mix") {
            const g = f[p + c] + ge * (f[p - 4 + c] + f[p + 4 + c] + f[p - W * 4 + c] + f[p + W * 4 + c]) + gd * (f[p - W * 4 - 4 + c] + f[p - W * 4 + 4 + c] + f[p + W * 4 - 4 + c] + f[p + W * 4 + 4 + c]);
            s = 0.5 * s + 0.5 * (g / (1 + 4 * ge + 4 * gd));
          }
          o[p + c] = Math.round(Math.min(mx, Math.max(mn, s)));
        }
      }
    }
  // back to bottom-up rows
  const b = Buffer.alloc(o.length);
  for (let y = 0; y < H; y++) b.set(o.subarray(y * W * 4, (y + 1) * W * 4), (H - 1 - y) * W * 4);
  fs.writeFileSync(path.join(opt.out, `f${String(k).padStart(4, "0")}.bin`), zlib.deflateSync(b, { level: 1 }));
}
fs.writeFileSync(path.join(opt.out, "meta.json"), JSON.stringify({ ...S.meta, info: S.meta.info.slice(0, N), filt: opt.f }));
console.log("filt", opt.f, N, "frames ->", opt.out);
