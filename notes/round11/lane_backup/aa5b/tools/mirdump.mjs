// Dumps the mirror target (dbgcap) around uv: luma and alpha (path length) per texel; GL uv (v up).
//   node mirdump.mjs DIR --k 52 --u 0.809 --v 0.8635 [--r 4]
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const argv = process.argv.slice(2); const dir = argv[0];
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const meta = JSON.parse(fs.readFileSync(path.join(dir, "dbg.json"), "utf8"));
const k = +arg("k", 52), u = +arg("u"), v = +arg("v"), r = +arg("r", 4);
const kk = `k${String(k).padStart(4, "0")}`;
const fr = meta.frames.find((f) => f.k === k);
const [w, h] = fr.dims.mirror;
const b = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_mirror.bin`)));
const d = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
// texel space: x = u*w - 0.5, GL row = v*h - 0.5; top-down row = h - 1 - GLrow
const tx = u * w - 0.5, ty = v * h - 0.5;
console.log(`${dir.split("/").pop()} k${k} mirror ${w}x${h} uv (${u}, ${v}) -> texel x ${tx.toFixed(2)} GLrow ${ty.toFixed(2)}`);
const cx = Math.round(tx), cy = Math.round(ty);
let hdr = "GLrow\\x ";
for (let x = cx - r; x <= cx + r; x++) hdr += String(x).padStart(12);
console.log(hdr);
for (let gy = cy + r; gy >= cy - r; gy--) {
  const row = h - 1 - gy;
  let s = String(gy).padStart(7) + " ";
  for (let x = cx - r; x <= cx + r; x++) {
    const i = (row * w + x) * 4;
    const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    s += `${L.toFixed(2)}/${d[i + 3] > 59000 ? "sky" : d[i + 3].toFixed(1)}`.padStart(12);
  }
  console.log(s);
}
