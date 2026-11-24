// Lists the meshes of a GLB and their open (boundary) edges: count, and the bounding boxes of boundary-edge clusters.
//   node glb_cracks.mjs <file.glb>
import fs from "node:fs";
const buf = fs.readFileSync(process.argv[2]);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
const bin = buf.subarray(20 + jsonLen + 8);
console.log("extensionsUsed", JSON.stringify(gltf.extensionsUsed || []));
const CT = { 5126: [4, "readFloatLE"], 5123: [2, "readUInt16LE"], 5125: [4, "readUInt32LE"], 5121: [1, "readUInt8"] };
const readAcc = (ai) => {
  const acc = gltf.accessors[ai];
  const bv = gltf.bufferViews[acc.bufferView];
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  const [size, fn] = CT[acc.componentType];
  const stride = bv.byteStride || size * comps;
  const off = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Array(acc.count);
  for (let k = 0; k < acc.count; k++) {
    const v = [];
    for (let c = 0; c < comps; c++) v.push(bin[fn](off + k * stride + c * size));
    out[k] = v;
  }
  return out;
};
// World matrices (translation / rotation / scale only).
const nodes = gltf.nodes;
const mat = (n) => {
  const t = n.translation || [0, 0, 0], r = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
  const [x, y, z, w] = r;
  const m = [
    (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
    2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
  return n.matrix || m;
};
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
  return o;
};
const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const parent = {};
nodes.forEach((n, i) => (n.children || []).forEach((c) => (parent[c] = i)));
const world = (i) => (parent[i] === undefined ? mat(nodes[i]) : mul(world(parent[i]), mat(nodes[i])));
const wantEdges = process.argv[3] ? new RegExp(process.argv[3]) : null;
nodes.forEach((n, ni) => {
  if (n.mesh === undefined) return;
  const W = world(ni);
  const mesh = gltf.meshes[n.mesh];
  mesh.primitives.forEach((pr, pi) => {
    const pos = readAcc(pr.attributes.POSITION).map((p) => xf(W, p));
    const idx = pr.indices !== undefined ? readAcc(pr.indices).map((v) => v[0]) : pos.map((_, i) => i);
    // Weld by exact position first (split normals / uvs duplicate vertices), then count edge uses.
    const key = (p) => p.map((v) => v.toFixed(5)).join(",");
    const id = new Map();
    const canon = pos.map((p) => { const k = key(p); if (!id.has(k)) id.set(k, id.size); return id.get(k); });
    const edges = new Map();
    for (let t = 0; t < idx.length; t += 3) {
      const a = canon[idx[t]], b = canon[idx[t + 1]], c = canon[idx[t + 2]];
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const k = u < v ? u + "_" + v : v + "_" + u;
        edges.set(k, (edges.get(k) || 0) + 1);
      }
    }
    let open = 0, nonman = 0;
    const openList = [];
    const upos = [];
    pos.forEach((p, i) => (upos[canon[i]] = p));
    for (const [k, c] of edges) {
      if (c === 1) { open++; const [u, v] = k.split("_").map(Number); openList.push([upos[u], upos[v]]); }
      if (c > 2) nonman++;
    }
    const bb = pos.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.min(b[2], p[2]), Math.max(b[3], p[0]), Math.max(b[4], p[1]), Math.max(b[5], p[2])], [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]);
    console.log(`${n.name} [${pi}] verts ${pos.length} (unique ${id.size}) tris ${idx.length / 3} open edges ${open} non-manifold ${nonman} bbox ${bb.map((v) => v.toFixed(1)).join(",")}`);
    if (wantEdges && wantEdges.test(n.name)) {
      // Cluster the open edges' midpoints on a 4 m grid.
      const cells = new Map();
      for (const [p, q] of openList) {
        const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
        const k = m.map((v) => Math.floor(v / 4)).join(",");
        cells.set(k, (cells.get(k) || 0) + 1);
      }
      const top = [...cells].sort((a, b) => b[1] - a[1]).slice(0, 25);
      console.log("   open-edge cells (4 m):", top.map(([k, c]) => `${k.split(",").map((v) => v * 4).join("/")}:${c}`).join("  "));
    }
  });
});
