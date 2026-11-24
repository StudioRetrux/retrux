// g3: print dbgcap mode values along a column of a dbgcap dir, mapping final-image coords to the (scaled) main target.
//   node dbgr.mjs DIR --k 91 --x 120 --y0 495 --y1 515 [--modes 0,7,12,13,14] [--scale 0.7]
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const argv = process.argv.slice(2); const dir = argv[0];
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const meta = JSON.parse(fs.readFileSync(path.join(dir, "dbg.json"), "utf8"));
const k = +arg("k", 52), x = +arg("x", 230), y0 = +arg("y0", 495), y1 = +arg("y1", 511), sc = +arg("scale", "1");
const modes = arg("modes", meta.modes.join(",")).split(",").map(Number);
const [cx0, cy0] = meta.crop;
const kk = `k${String(k).padStart(4, "0")}`;
const fr = meta.frames.find((f) => f.k === k);
const loadF = (name) => { const b = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_${name}.bin`))); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const fin = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_final.bin`)));
const data = {}; for (const m of modes) data[m] = loadF("m" + m);
const [w] = fr.dims.final;
const DEC = +(process.env.DEC || 3);
const f3 = (v) => (Math.abs(v) >= 1000 ? v.toExponential(2) : v.toFixed(DEC)).padStart(DEC + 6);
const tx0 = Math.floor(cx0 * sc), ty0 = Math.floor(cy0 * sc);
console.log(`${dir.split("/").pop()} k${k} x${x} msize ${fr.info.msize}`);
let lastTy = -1;
for (let y = y0; y < y1; y++) {
  const i = ((y - cy0) * w + (x - cx0));
  const tx = Math.floor((x + 0.5) * sc), ty = Math.floor((y + 0.5) * sc);
  let s = `y${y} fin ${[0, 1, 2].map((c) => String(fin[i * 4 + c]).padStart(3)).join(" ")} |` + (ty === lastTy ? " (same tgt row)" : "");
  lastTy = ty;
  for (const m of modes) { const [mw] = fr.dims["m" + m]; const d = data[m]; const j = (ty - ty0) * mw + (tx - tx0); s += ` m${m}: ${[0, 1, 2, 3].map((c) => f3(d[j * 4 + c])).join("")} |`; }
  console.log(s);
}
