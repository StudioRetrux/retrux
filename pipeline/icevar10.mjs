// Ice batch 10: gentler scallops (0.22 read as hammered metal at rest) and no cell-border web on the bands.
import B7 from "./icevar7.mjs";
const V7 = B7.v7b;
const TILT = "vec3 tilt = (t * rnd.x + b * rnd.y) * 0.2;";
const NR = "vec3 Nr = normalize(mix(Ng, Nf, 0.55) + (N - Nf) * 0.5);";
const EDGE = "body += scatterLight * edgeMask * (0.02 + 0.04 * cellRand);";
const scallop = (k) => [[TILT, `vec3 offT = off - n * dot(off, n);
  vec3 tilt = (t * rnd.x + b * rnd.y) * 0.08 + offT / max(length(offT), 1e-4) * ${k.toFixed(3)} * smoothstep(0.0, 0.08, length(offT));`]];
const nrFacet = [[NR, "vec3 Nr = normalize(mix(Ng, Nf, 0.85) + (N - Nf) * 0.4);"]];
const noWeb = [[EDGE, "body += scatterLight * edgeMask * (0.008 + 0.012 * cellRand);"]];
const box = (n) => [
  ["float n4 = pow(pow(abs(q.x), 4.0) + pow(abs(q.y), 4.0), 0.25);", `float n4 = pow(pow(abs(q.x), ${n.toFixed(1)}) + pow(abs(q.y), ${n.toFixed(1)}), ${(1 / n).toFixed(4)});`],
  ["vec2 g = vec2(sign(qa.x) * pow(abs(qa.x), 3.0) / uSectionHalf.x, sign(qa.y) * pow(abs(qa.y), 3.0) / uSectionHalf.y);", `vec2 g = vec2(sign(qa.x) * pow(abs(qa.x), ${(n - 1).toFixed(1)}) / uSectionHalf.x, sign(qa.y) * pow(abs(qa.y), ${(n - 1).toFixed(1)}) / uSectionHalf.y);`],
];
export default {
  s12: { js: V7.js, frag: [...V7.frag, ...scallop(0.12), ...nrFacet, ...noWeb], vert: box(8) },
  s16: { js: V7.js, frag: [...V7.frag, ...scallop(0.16), ...nrFacet, ...noWeb], vert: box(8) },
  s16b6: { js: V7.js, frag: [...V7.frag, ...scallop(0.16), ...nrFacet, ...noWeb], vert: box(6) },
};
