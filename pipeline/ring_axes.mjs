// Ring axes from ringMocap.ts at given loop times: axis (world), |axis.z| (apparent height / width of the ring),
// and the band's tip angle (axis from vertical, towards the camera).
//   node ring_axes.mjs 0 0.5 1.0 1.5
import fs from "node:fs";
const src = fs.readFileSync("E:/Retrux Hero R&D/retrux-web/app/hero/engine/hero/ringMocap.ts", "utf8");
const step = +src.match(/RING_MOCAP_STEP = ([\d.]+)/)[1];
const json = src.slice(src.indexOf("= {", src.indexOf("export const RING_MOCAP:")) + 2).trim().replace(/;\s*$/, "");
const M = JSON.parse(json.slice(0, json.lastIndexOf("}") + 1));
const slerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map((x) => -x); d = -d; }
  if (d > 0.9995) { const r = a.map((x, i) => x + (b[i] - x) * t); const n = Math.hypot(...r); return r.map((x) => x / n); }
  const th = Math.acos(d), s = Math.sin(th);
  return a.map((x, i) => (x * Math.sin((1 - t) * th) + b[i] * Math.sin(t * th)) / s);
};
const rot = ([x, y, z, w], v) => {
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
};
for (const t of process.argv.slice(2).map(Number)) {
  const row = [];
  for (const id of ["A", "B", "C", "D"]) {
    const keys = M[id];
    const period = (keys.length - 1) * step;
    const tl = ((t % period) + period) % period;
    const kf = tl / step, k0 = Math.min(Math.floor(kf), keys.length - 2);
    const q = slerp(keys[k0], keys[k0 + 1], kf - k0);
    const n = rot(q, [0, 0, 1]);
    const tip = (Math.atan2(Math.abs(n[2]), Math.hypot(n[0], n[1])) * 180) / Math.PI;
    row.push(`${id}: n=(${n.map((v) => v.toFixed(2)).join(",")}) |nz|=${Math.abs(n[2]).toFixed(2)} tipFromEdge=${tip.toFixed(1)}deg period=${period}`);
  }
  console.log(`t=${t}\n  ${row.join("\n  ")}`);
}
