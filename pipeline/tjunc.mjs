import fs from "node:fs";
const segs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const TOL = +(process.argv[3] || 0.01);
// Endpoints that lie in the interior of another open edge (T-junctions) and endpoints with a near-duplicate.
const pts = [];
segs.forEach(([a, b]) => { pts.push(a, b); });
const key = (p) => p.map((v) => v.toFixed(4)).join(",");
const uniq = new Map();
pts.forEach((p) => uniq.set(key(p), p));
const U = [...uniq.values()];
let tj = 0, dup = 0, both = 0;
const dist2seg = (p, a, b) => {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const L = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const t = L > 0 ? (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L : 0;
  if (t <= 0.02 || t >= 0.98) return [1e9, t];
  const q = [a[0] + ab[0] * t - p[0], a[1] + ab[1] * t - p[1], a[2] + ab[2] * t - p[2]];
  return [Math.hypot(...q), t];
};
// grid of segments by midpoint (5 m cells) for speed
const cell = (p) => p.map((v) => Math.floor(v / 5)).join(",");
const grid = new Map();
segs.forEach((s, i) => { const m = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2, (s[0][2] + s[1][2]) / 2]; const k = cell(m); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
const near = [];
for (const p of U) {
  const c = p.map((v) => Math.floor(v / 5));
  let isT = false, isD = false;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    for (const i of grid.get([c[0] + dx, c[1] + dy, c[2] + dz].join(",")) || []) {
      const [a, b] = segs[i];
      const da = Math.hypot(a[0] - p[0], a[1] - p[1], a[2] - p[2]), db = Math.hypot(b[0] - p[0], b[1] - p[1], b[2] - p[2]);
      if ((da > 1e-6 && da < TOL) || (db > 1e-6 && db < TOL)) isD = true;
      const [d] = dist2seg(p, a, b);
      if (d < TOL) isT = true;
    }
  }
  if (isT) tj++; if (isD) dup++; if (isT && isD) both++;
  if (isT || isD) near.push(p);
}
// open-edge length total and bbox of "crack" endpoints
const bb = near.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.min(b[2], p[2]), Math.max(b[3], p[0]), Math.max(b[4], p[1]), Math.max(b[5], p[2])], [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]);
console.log(`segs ${segs.length} endpoints ${U.length} T-junction ${tj} near-dup ${dup} both ${both} (tol ${TOL}) crack bbox ${bb.map((v) => v.toFixed(1)).join(",")}`);
