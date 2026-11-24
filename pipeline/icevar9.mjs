// Ice batch 9: the candidate to port (batch 8 scallopBox with a gentler scallop), checked at more poses.
import B7 from "./icevar7.mjs";
const V7 = B7.v7b;
const TILT = "vec3 tilt = (t * rnd.x + b * rnd.y) * 0.2;";
const NR = "vec3 Nr = normalize(mix(Ng, Nf, 0.55) + (N - Nf) * 0.5);";
const scallop = (k) => [[TILT, `vec3 offT = off - n * dot(off, n);
  vec3 tilt = (t * rnd.x + b * rnd.y) * 0.08 + offT / max(length(offT), 1e-4) * ${k.toFixed(3)} * smoothstep(0.0, 0.08, length(offT));`]];
const nrFacet = [[NR, "vec3 Nr = normalize(mix(Ng, Nf, 0.85) + (N - Nf) * 0.4);"]];
const box = (n) => [
  ["float n4 = pow(pow(abs(q.x), 4.0) + pow(abs(q.y), 4.0), 0.25);", `float n4 = pow(pow(abs(q.x), ${n.toFixed(1)}) + pow(abs(q.y), ${n.toFixed(1)}), ${(1 / n).toFixed(4)});`],
  ["vec2 g = vec2(sign(qa.x) * pow(abs(qa.x), 3.0) / uSectionHalf.x, sign(qa.y) * pow(abs(qa.y), 3.0) / uSectionHalf.y);", `vec2 g = vec2(sign(qa.x) * pow(abs(qa.x), ${(n - 1).toFixed(1)}) / uSectionHalf.x, sign(qa.y) * pow(abs(qa.y), ${(n - 1).toFixed(1)}) / uSectionHalf.y);`],
];
export default {
  final: { js: V7.js, frag: [...V7.frag, ...scallop(0.22), ...nrFacet], vert: box(8) },
};
