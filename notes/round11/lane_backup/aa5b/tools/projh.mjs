// For a face lookup uv (from debug mode 12), reconstruct X (the lookup point at height hM above y0) on the mirrored-camera ray,
// and print the target row (GL, texel-centre coords) of X + h for a range of h.
//   node projh.mjs DIR --k 52 --u 0.809 --v 0.8635 --hm 0.05 [--y0 0]
import fs from "node:fs"; import path from "node:path";
const argv = process.argv.slice(2); const dir = argv[0];
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const meta = JSON.parse(fs.readFileSync(path.join(dir, "dbg.json"), "utf8"));
const k = +arg("k", 52), u = +arg("u"), v = +arg("v"), hm = +arg("hm", 0.05), y0 = +arg("y0", 0);
const fr = meta.frames.find((f) => f.k === k);
const M = fr.info.envVP; // column-major
const [mw, mh] = fr.dims.mirror;
const mul = (m, p) => [0, 1, 2, 3].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r] * p[3]);
const proj = (X) => { const c = mul(M, [X[0], X[1], X[2], 1]); return [c[0] / c[3] * 0.5 + 0.5, c[1] / c[3] * 0.5 + 0.5]; };
const C = fr.info.mcam;
// find X on the ray from C whose y = y0 + hm and whose projection is (u, v): search direction by Newton on 2 angles
// param: X = C + s * dir; with y fixed: s = (y0 + hm - C.y) / dir.y. Solve for dir(az, el).
let az = 0, el = 0.05;
// initial az from the camera forward: use the inverse by brute force grid
let best = null;
for (let a = -Math.PI; a < Math.PI; a += 0.002) for (let e = 0.02; e < 0.12; e += 0.002) {
  const d = [Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a)];
  const s = (y0 + hm - C[1]) / d[1];
  const X = [C[0] + s * d[0], y0 + hm, C[2] + s * d[2]];
  const p = proj(X);
  const err = (p[0] - u) ** 2 + (p[1] - v) ** 2;
  if (!best || err < best.err) best = { err, a, e };
}
// refine
for (let it = 0; it < 4; it++) {
  const st = 0.002 / 10 ** (it + 1) * 5;
  const b0 = best;
  for (let a = b0.a - 10 * st; a <= b0.a + 10 * st; a += st) for (let e = b0.e - 10 * st; e <= b0.e + 10 * st; e += st) {
    const d = [Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a)];
    const s = (y0 + hm - C[1]) / d[1];
    const X = [C[0] + s * d[0], y0 + hm, C[2] + s * d[2]];
    const p = proj(X);
    const err = (p[0] - u) ** 2 + (p[1] - v) ** 2;
    if (err < best.err) best = { err, a, e };
  }
}
const d = [Math.cos(best.e) * Math.sin(best.a), Math.sin(best.e), -Math.cos(best.e) * Math.cos(best.a)];
const s = (y0 + hm - C[1]) / d[1];
const X = [C[0] + s * d[0], 0, C[2] + s * d[2]];
console.log(`k${k} uv (${u}, ${v}) err ${Math.sqrt(best.err).toExponential(1)} X (${X.map((x) => x.toFixed(2)).join(", ")}) dist from mcam ${Math.hypot(X[0] - C[0], X[2] - C[2]).toFixed(2)}`);
for (const h of [-0.1, -0.05, 0, 0.025, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4]) {
  const p = proj([X[0], y0 + h, X[2]]);
  console.log(`  h ${h.toFixed(3).padStart(6)}: texel x ${(p[0] * mw - 0.5).toFixed(2)} GLrow ${(p[1] * mh - 0.5).toFixed(2)}`);
}
