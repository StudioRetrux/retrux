// print debug values: node dbgv.mjs DIR k y x0 x1 step
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const [dir, k, y, x0, x1, st] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(dir, "dbg.json")));
const [cx0, cy0] = meta.crop;
const fr = meta.frames.find((f) => f.k === +k);
const kk = `k${String(+k).padStart(4, "0")}`;
const ld = (name, f32) => { const b = zlib.inflateSync(fs.readFileSync(path.join(dir, `${kk}_${name}.bin`))); return f32 ? new Float32Array(b.buffer, b.byteOffset, b.length / 4) : b; };
const fin = ld("final", false);
const [fw] = fr.dims.final;
const M = {};
for (const m of meta.modes) M[m] = ld("m" + m, true);
const [mw] = fr.dims["m" + meta.modes[0]];
const f2 = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2));
console.log(`k${k} y${y} msize ${fr.info.msize} main ${fr.info.main}`);
console.log("x    fin | gFt aFt hFt share | r0L r1L r0a-dX r1a-dX | cF0L cFL frac dX | hits topRows ftRow uvMRow | rmL rma-dX r2L r2a-dX");
for (let x = +x0; x <= +x1; x += +st) {
  const i = (+y - cy0) * fw + (x - cx0);
  const L = Math.round(0.2126 * fin[i * 4] + 0.7152 * fin[i * 4 + 1] + 0.0722 * fin[i * 4 + 2]);
  const j = ((+y - cy0) * mw + (x - cx0)) * 4;
  const g = (m) => Array.from(M[m].subarray(j, j + 4)).map(f2).join(" ");
  console.log(`${x} ${L} | ${g(12)} | ${g(13)} | ${g(14)} | ${g(15)} | ${g(16)}`);
}
