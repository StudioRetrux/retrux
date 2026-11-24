// Decodes a Draco GLB and reports, per mesh: open (boundary) edges after an exact-position weld, how many of them would
// close with a weld at a tolerance (unmerged near-duplicates), and how many are T-junctions (an open edge's endpoint lying
// on another open edge). Writes <mesh>_open.json (world-space open-edge segments) for meshes matching argv[3].
//   node glb_cracks_draco.mjs <file.glb> [meshNameRegex] [weldTol=0.01]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire("e:/Retrux Hero R&D/retrux-web/package.json");
const draco3d = require("draco3d");
const file = process.argv[2];
const want = process.argv[3] ? new RegExp(process.argv[3]) : null;
const TOL = +(process.argv[4] || 0.01);
const buf = fs.readFileSync(file);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
const bin = buf.subarray(20 + jsonLen + 8);
const dm = await draco3d.createDecoderModule({});
const decode = (bvIndex, attrIds) => {
  const bv = gltf.bufferViews[bvIndex];
  const data = new Int8Array(bin.buffer, bin.byteOffset + (bv.byteOffset || 0), bv.byteLength);
  const dec = new dm.Decoder();
  const db = new dm.DecoderBuffer();
  db.Init(data, data.length);
  const mesh = new dm.Mesh();
  const st = dec.DecodeBufferToMesh(db, mesh);
  if (!st.ok()) throw new Error("draco " + st.error_msg());
  const nf = mesh.num_faces(), np = mesh.num_points();
  const idx = new Uint32Array(nf * 3);
  const fa = new dm.DracoInt32Array();
  for (let f = 0; f < nf; f++) { dec.GetFaceFromMesh(mesh, f, fa); idx[f * 3] = fa.GetValue(0); idx[f * 3 + 1] = fa.GetValue(1); idx[f * 3 + 2] = fa.GetValue(2); }
  const att = dec.GetAttributeByUniqueId(mesh, attrIds.POSITION);
  const arr = new dm.DracoFloat32Array();
  dec.GetAttributeFloatForAllPoints(mesh, att, arr);
  const pos = new Float32Array(np * 3);
  for (let i = 0; i < np * 3; i++) pos[i] = arr.GetValue(i);
  [fa, arr, mesh, db, dec].forEach((o) => dm.destroy(o));
  return { idx, pos };
};
const nodes = gltf.nodes;
const mat = (n) => {
  if (n.matrix) return n.matrix;
  const t = n.translation || [0, 0, 0], r = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
  const [x, y, z, w] = r;
  return [
    (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
    2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
};
const mul = (a, b) => { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; };
const parent = {};
nodes.forEach((n, i) => (n.children || []).forEach((c) => (parent[c] = i)));
const world = (i) => (parent[i] === undefined ? mat(nodes[i]) : mul(world(parent[i]), mat(nodes[i])));
const xf = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
for (let ni = 0; ni < nodes.length; ni++) {
  const n = nodes[ni];
  if (n.mesh === undefined) continue;
  const W = world(ni);
  gltf.meshes[n.mesh].primitives.forEach((pr, pi) => {
    const ext = pr.extensions && pr.extensions.KHR_draco_mesh_compression;
    if (!ext) return;
    const { idx, pos } = decode(ext.bufferView, ext.attributes);
    const np = pos.length / 3;
    const P = [];
    for (let i = 0; i < np; i++) P.push(xf(W, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
    // Exact weld (split normals / uvs duplicate points).
    const id = new Map(), canon = new Int32Array(np), U = [];
    for (let i = 0; i < np; i++) { const k = P[i].join(","); if (!id.has(k)) { id.set(k, id.size); U.push(P[i]); } canon[i] = id.get(k); }
    const edges = new Map();
    for (let t = 0; t < idx.length; t += 3) {
      const a = canon[idx[t]], b = canon[idx[t + 1]], c = canon[idx[t + 2]];
      for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? u * 4194304 + v : v * 4194304 + u; edges.set(k, (edges.get(k) || 0) + 1); }
    }
    const open = [];
    for (const [k, c] of edges) if (c === 1) open.push([Math.floor(k / 4194304), k % 4194304]);
    // Near-duplicates: open-edge endpoints within TOL of another (different) open-edge endpoint.
    const ends = new Set(open.flat());
    const cell = (p) => p.map((v) => Math.floor(v / TOL)).join(",");
    const grid = new Map();
    for (const e of ends) { const k = cell(U[e]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(e); }
    let nearDup = 0;
    for (const e of ends) {
      const p = U[e];
      const c = p.map((v) => Math.floor(v / TOL));
      let hit = false;
      for (let dx = -1; dx <= 1 && !hit; dx++) for (let dy = -1; dy <= 1 && !hit; dy++) for (let dz = -1; dz <= 1 && !hit; dz++) {
        for (const o of grid.get([c[0] + dx, c[1] + dy, c[2] + dz].join(",")) || []) {
          if (o !== e && Math.hypot(U[o][0] - p[0], U[o][1] - p[1], U[o][2] - p[2]) < TOL) { hit = true; break; }
        }
      }
      if (hit) nearDup++;
    }
    const bb = U.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.min(b[2], p[2]), Math.max(b[3], p[0]), Math.max(b[4], p[1]), Math.max(b[5], p[2])], [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]);
    console.log(`${n.name} [${pi}] pts ${np} unique ${U.length} tris ${idx.length / 3} open ${open.length} endpoints ${ends.size} near-dup(<${TOL}) ${nearDup} bbox ${bb.map((v) => v.toFixed(1)).join(",")}`);
    if (want && want.test(n.name)) {
      const segs = open.map(([u, v]) => [U[u], U[v]]);
      fs.writeFileSync(path.join(path.dirname(process.argv[1]), `${n.name.replace(/\W/g, "_")}_open.json`), JSON.stringify(segs));
    }
  });
}
