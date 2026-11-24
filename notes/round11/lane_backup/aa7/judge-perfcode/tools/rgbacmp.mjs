// rgbacmp.mjs A B W H [outPrefix] [--flip]: two raw RGBA frames (.rgba or .rgba.z, bottom-up from readPixels when --flip):
// count of px differing, max channel diff, px > 4 / > 16 levels; writes A.png and a diff x8 png when outPrefix is given.
import fs from "node:fs";
import zlib from "node:zlib";
import { png } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const [a, b, Ws, Hs, pre] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const flip = process.argv.includes("--flip");
const W = +Ws, H = +Hs;
const ld = (f) => { let x = fs.readFileSync(f); if (f.endsWith(".z")) x = zlib.inflateSync(x); if (flip) { const o = Buffer.alloc(x.length); for (let y = 0; y < H; y++) x.copy(o, y * W * 4, (H - 1 - y) * W * 4, (H - y) * W * 4); x = o; } return x; };
const A = ld(a), B = ld(b);
let n = 0, mx = 0, n4 = 0, n16 = 0;
const D = Buffer.alloc(A.length);
for (let i = 0; i < W * H; i++) {
  let m = 0;
  for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(A[i * 4 + c] - B[i * 4 + c]));
  if (m) n++; if (m > 4) n4++; if (m > 16) n16++; mx = Math.max(mx, m);
  const v = Math.min(255, m * 8); D[i * 4] = v; D[i * 4 + 1] = v; D[i * 4 + 2] = v; D[i * 4 + 3] = 255;
}
console.log(JSON.stringify({ a: a.split("/").pop(), b: b.split("/").pop(), W, H, differ: n, gt4: n4, gt16: n16, max: mx }));
if (pre) { png(A, W, H, pre + "_a.png"); png(B, W, H, pre + "_b.png"); png(D, W, H, pre + "_diff8.png"); }
