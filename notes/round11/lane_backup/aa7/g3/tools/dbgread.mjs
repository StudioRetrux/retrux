// Prints debug-mode values along a column (x) or row of a dbgcap dir.
//   node dbgread.mjs DIR --k 52 --x 230 --y0 495 --y1 511 [--modes 0,7,8]
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const argv = process.argv.slice(2); const dir = argv[0];
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const meta = JSON.parse(fs.readFileSync(path.join(dir, "dbg.json"), "utf8"));
const k = +arg("k", 52), x = +arg("x", 230), y0 = +arg("y0", 495), y1 = +arg("y1", 511);
const modes = arg("modes", meta.modes.join(",")).split(",").map(Number);
const [cx0, cy0] = meta.crop;
const kk = `k${String(k).padStart(4, "0")}`;
const fr = meta.frames.find((f) => f.k === k);
const loadF = (name) => { const b = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_${name}.bin`))); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const fin = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_final.bin`)));
const data = {}; for (const m of modes) data[m] = loadF("m" + m);
const [w] = fr.dims.final;
const f3 = (v) => (Math.abs(v) >= 1000 ? v.toExponential(2) : v.toFixed(+(process.env.DEC || 3))).padStart(+(process.env.DEC || 3) + 5);
console.log(`${dir.split("/").pop()} k${k} x${x}`);
for (let y = y0; y < y1; y++) {
  const i = ((y - cy0) * w + (x - cx0));
  let s = `y${y} fin ${[0, 1, 2].map((c) => String(fin[i * 4 + c]).padStart(3)).join(" ")} |`;
  for (const m of modes) { const d = data[m]; s += ` m${m}: ${[0, 1, 2, 3].map((c) => f3(d[i * 4 + c])).join("")} |`; }
  console.log(s);
}
