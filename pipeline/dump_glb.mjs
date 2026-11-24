// Dumps the node hierarchy, rest transforms and animation channels of a GLB.
//   node dump_glb.mjs <file.glb>
import fs from "node:fs";

const buf = fs.readFileSync(process.argv[2]);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
const binStart = 20 + jsonLen + 8;
const bin = buf.subarray(binStart);
const nodes = gltf.nodes;
const parent = {};
nodes.forEach((n, i) => (n.children || []).forEach((c) => (parent[c] = i)));
const f = (a) => (a ? a.map((x) => +x.toFixed(3)) : undefined);
const walk = (i, depth) => {
  const n = nodes[i];
  console.log(`${"  ".repeat(depth)}[${i}] ${n.name}${n.mesh !== undefined ? " (mesh)" : ""} t=${JSON.stringify(f(n.translation))} r=${JSON.stringify(f(n.rotation))} s=${JSON.stringify(f(n.scale))}`);
  (n.children || []).forEach((c) => walk(c, depth + 1));
};
const roots = gltf.scenes[gltf.scene || 0].nodes;
roots.forEach((r) => walk(r, 0));

const readAcc = (ai) => {
  const acc = gltf.accessors[ai];
  const bv = gltf.bufferViews[acc.bufferView];
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  const off = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = [];
  for (let k = 0; k < acc.count; k++) {
    const v = [];
    for (let c = 0; c < comps; c++) v.push(bin.readFloatLE(off + (k * comps + c) * 4));
    out.push(v);
  }
  return out;
};
for (const anim of gltf.animations || []) {
  console.log(`\nanimation ${anim.name}`);
  for (const ch of anim.channels) {
    const s = anim.samplers[ch.sampler];
    const times = readAcc(s.input).map((v) => v[0]);
    const vals = readAcc(s.output);
    const node = nodes[ch.target.node];
    const pick = [0, Math.floor(vals.length / 4), Math.floor(vals.length / 2), Math.floor((3 * vals.length) / 4), vals.length - 1];
    console.log(
      `  ${node.name}.${ch.target.path} keys=${times.length} t=[${times[0].toFixed(2)}..${times[times.length - 1].toFixed(2)}] ${s.interpolation || "LINEAR"}`,
    );
    for (const k of [...new Set(pick)]) console.log(`     t=${times[k].toFixed(3)} v=${JSON.stringify(f(vals[k]))}`);
  }
}
