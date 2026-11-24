// Ice variants, batch 8 (on top of v7b): break the smooth cylinder lens. Scalloped (Voronoi F1 cone) facets as in
// Blender's Ice.004 displacement, stronger plateau facets, and a boxier slab section.
import B7 from "./icevar7.mjs";
const V7 = B7.v7b;
const TILT = "vec3 tilt = (t * rnd.x + b * rnd.y) * 0.2;";
const NR = "vec3 Nr = normalize(mix(Ng, Nf, 0.55) + (N - Nf) * 0.5);"; // (batch 5 mottle)
const scallop = (k) => [[TILT, `// Ice.004's Voronoi F1 displacement: every cell a shallow cone dimple (the surface rises away from its
  // feature point), so the facets are scalloped chips with sharp ridges at the cell borders.
  vec3 offT = off - n * dot(off, n);
  vec3 tilt = (t * rnd.x + b * rnd.y) * 0.08 + offT / max(length(offT), 1e-4) * ${k.toFixed(3)} * smoothstep(0.0, 0.08, length(offT));`]];
const facet = [[TILT, "vec3 tilt = (t * rnd.x + b * rnd.y) * 0.45;"]];
const nrFacet = [[NR, "vec3 Nr = normalize(mix(Ng, Nf, 0.85) + (N - Nf) * 0.4);"]];
const box = (n) => [
  ["float n4 = pow(pow(abs(q.x), 4.0) + pow(abs(q.y), 4.0), 0.25);", `float n4 = pow(pow(abs(q.x), ${n.toFixed(1)}) + pow(abs(q.y), ${n.toFixed(1)}), ${(1 / n).toFixed(4)});`],
  ["vec2 g = vec2(sign(qa.x) * pow(abs(qa.x), 3.0) / uSectionHalf.x, sign(qa.y) * pow(abs(qa.y), 3.0) / uSectionHalf.y);", `vec2 g = vec2(sign(qa.x) * pow(abs(qa.x), ${(n - 1).toFixed(1)}) / uSectionHalf.x, sign(qa.y) * pow(abs(qa.y), ${(n - 1).toFixed(1)}) / uSectionHalf.y);`],
];
export default {
  scallop: { js: V7.js, frag: [...V7.frag, ...scallop(0.25), ...nrFacet] },
  facet: { js: V7.js, frag: [...V7.frag, ...facet, ...nrFacet] },
  box8: { js: V7.js, frag: V7.frag, vert: box(8) },
  scallopBox: { js: V7.js, frag: [...V7.frag, ...scallop(0.25), ...nrFacet], vert: box(8) },
};
