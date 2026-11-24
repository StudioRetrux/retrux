// node dbgcol.mjs DIR K X Y0 Y1 : debug modes at screen column X (rows Y0..Y1), mapping to the scaled target.
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const [dir, K, X, Y0, Y1] = process.argv.slice(2); const k = +K, x = +X;
const meta = JSON.parse(fs.readFileSync(path.join(dir, "dbg.json"), "utf8"));
const [cx0, cy0, cx1, cy1] = meta.crop; const fr = meta.frames.find((f) => f.k === k);
const kk = `k${String(k).padStart(4, "0")}`; const sc = fr.info.res[0] / 1440;
const a0 = Math.floor(cx0 * sc), b0 = Math.floor(cy0 * sc);
const fin = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_final.bin`))); const [fw] = fr.dims.final;
const L = (m) => { const b = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_m${m}.bin`))); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const modes = meta.modes.filter((m) => m !== 0 && fs.existsSync(path.join(dir, `${kk}_m${m}.bin`)));
const D = {}; for (const m of modes) D[m] = L(m); const tw = fr.dims["m" + modes[0]][0];
const f = (v) => (Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(3)).padStart(8);
console.log(`${path.basename(dir)} ${kk} x${x} sc ${sc.toFixed(3)} msize ${fr.info.msize}`);
let lastTy = -1;
for (let y = +Y0; y <= +Y1; y++) {
  const tx = Math.floor(x * sc) - a0, ty = Math.floor(y * sc) - b0; const fi = ((y - cy0) * fw + (x - cx0)) * 4;
  const lf = Math.round(0.2126 * fin[fi] + 0.7152 * fin[fi + 1] + 0.0722 * fin[fi + 2]);
  if (ty === lastTy) { console.log(`y${y} fin ${lf}`); continue; } lastTy = ty;
  let s = `y${y} fin ${String(lf).padStart(3)} ty${ty} |`; const i = (ty * tw + tx) * 4;
  for (const m of modes) s += ` m${m}:${[0, 1, 2, 3].map((c) => f(D[m][i + c])).join("")} |`;
  console.log(s);
}
