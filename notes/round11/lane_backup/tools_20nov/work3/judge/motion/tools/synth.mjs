// Synthetic validation sequences in cap.mjs format: a vertical lake/solid edge moving v px/frame with textures moving along.
//   node synth.mjs OUTDIR v N   -> OUTDIR/{aa,alias,aa2,mask}
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const [out, vS, nS] = process.argv.slice(2); const v = +vS, N = +nS;
const W = 1440, Hf = 766, y0 = 380, y1 = 766, H = y1 - y0;
const lakeT = (x, y, t) => 70 + 18 * Math.sin((2 * Math.PI * (x - v * t)) / 23) + 10 * Math.sin((2 * Math.PI * y) / 13) + 8 * Math.sin((2 * Math.PI * (x - v * t)) / 9 + (2 * Math.PI * y) / 31);
const solT = (x, y, t) => 210 + 15 * Math.sin((2 * Math.PI * (x - v * t)) / 17) + 12 * Math.sin((2 * Math.PI * y) / 11) + 8 * Math.sin((2 * Math.PI * (x - v * t)) / 7 - (2 * Math.PI * y) / 19);
const vars = { aa: [], alias: [], aa2: [], mask: [] };
for (const n of Object.keys(vars)) fs.mkdirSync(path.join(out, n), { recursive: true });
const info = [];
for (let k = 0; k < N; k++) {
  const e = 300.2 + v * k; // edge position (lake for x < e)
  const fa = Buffer.alloc(W * H * 4), fl = Buffer.alloc(W * H * 4), m = Buffer.alloc(W * H);
  for (let yy = 0; yy < H; yy++) {
    const row = H - 1 - yy; // stored bottom-up
    const y = yy + y0;
    for (let x = 0; x < W; x++) {
      const cov = Math.max(0, Math.min(1, e - x));
      const L = lakeT(x + 0.5, y, k), S = solT(x + 0.5, y, k);
      const a = cov * L + (1 - cov) * S;
      const al = x + 0.5 < e ? L : S;
      const i = (row * W + x) * 4;
      fa[i] = fa[i + 1] = fa[i + 2] = Math.round(a); fa[i + 3] = 255;
      fl[i] = fl[i + 1] = fl[i + 2] = Math.round(al); fl[i + 3] = 255;
      m[row * W + x] = cov > 0.502 ? 1 : cov > 0.063 ? 2 : 0;
    }
  }
  const nm = `f${String(k).padStart(4, "0")}.bin`;
  fs.writeFileSync(path.join(out, "aa", nm), zlib.deflateSync(fa, { level: 1 }));
  fs.writeFileSync(path.join(out, "aa2", nm), zlib.deflateSync(fa, { level: 1 }));
  fs.writeFileSync(path.join(out, "alias", nm), zlib.deflateSync(fl, { level: 1 }));
  fs.writeFileSync(path.join(out, "mask", `m${String(k).padStart(4, "0")}.bin`), zlib.deflateSync(m, { level: 1 }));
  fs.writeFileSync(path.join(out, "mask", nm), zlib.deflateSync(fa, { level: 1 }));
  info.push({ k, mirror: k % 3 === 0 ? 1 : 0, pos: [0, 0, 0] });
}
for (const n of Object.keys(vars)) fs.writeFileSync(path.join(out, n, "meta.json"), JSON.stringify({ W, H: Hf, y0, y1, info }));
console.log("synth", out, v, N);
