// Ice batch 52 (QC round 8, ice CRITICAL "smooth extruded acrylic: outlines too round, end caps flat machine cuts"; round 7
// T19). The ring meshes are low-poly (hero.glb: a quarter of A 1088 tris, a half of B 4096, C / D 2112: ~0.1 m per
// segment along the ring), so the vertex displacement (fbm, ~0.4 m wavelength, +-4 cm) is sampled ~4x per bump and
// the outline reads as a smooth circle.
// sub1: midpoint subdivision of every piece (x4 triangles, indexed and welded; JS on the live meshes) only.
// sil1: sub1 + a sharper height field (3 octaves + ridged chips at 2.2x the scale: angular breaks) + a TANGENTIAL
//       displacement (along the ring): the side faces only slide along themselves, the end caps turn into uneven,
//       broken faces; one continuous position field, so caps and sides stay welded (no cracks).
// sil2: sil1 with 1.35x the radial amplitude.
const SUBDIV_JS = `
const subdiv = (g) => {
  const idx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
  const names = Object.keys(g.attributes);
  const n0 = g.attributes.position.count;
  const data = {}, size = {};
  for (const a of names) { data[a] = Array.from(g.attributes[a].array); size[a] = g.attributes[a].itemSize; }
  const mid = new Map();
  let count = n0;
  const midOf = (i, j) => {
    const key = i < j ? i * 1048576 + j : j * 1048576 + i;
    let m = mid.get(key);
    if (m !== undefined) return m;
    m = count++;
    for (const a of names) { const s = size[a]; for (let k = 0; k < s; k++) data[a].push((data[a][i * s + k] + data[a][j * s + k]) / 2); }
    mid.set(key, m);
    return m;
  };
  const out = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const ab = midOf(a, b), bc = midOf(b, c), ca = midOf(c, a);
    out.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  const ng = new g.constructor();
  for (const a of names) {
    const src = g.attributes[a];
    ng.setAttribute(a, new src.constructor(new src.array.constructor(data[a]), size[a], src.normalized));
  }
  ng.setIndex(out);
  const nr = ng.attributes.normal;
  if (nr) for (let i = n0; i < count; i++) { const x = nr.getX(i), y = nr.getY(i), z = nr.getZ(i); const l = Math.hypot(x, y, z) || 1; nr.setXYZ(i, x / l, y / l, z / l); }
  ng.computeBoundingBox();
  ng.computeBoundingSphere();
  return ng;
};
// Originals and subdivided copies cached on window, so "none" (first at every pose) can be restored by zbase (last).
if (!window.__geo) window.__geo = { orig: h.rings.pieces.map((p) => p.mesh.geometry), sub: null };
if (!window.__geo.sub) {
  window.__geo.sub = window.__geo.orig.map((g) => subdiv(g));
  const tri = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  console.log("subdiv tris", window.__geo.orig.reduce((s, g) => s + tri(g), 0), "->", window.__geo.sub.reduce((s, g) => s + tri(g), 0));
}
h.rings.pieces.forEach((p, i) => { p.mesh.geometry = window.__geo.sub[i]; });
`;
const RESTORE_JS = `if (window.__geo) h.rings.pieces.forEach((p, i) => { p.mesh.geometry = window.__geo.orig[i]; });`;
const HEIGHT = `vec4 iceHeight(vec3 p) {
  const float k = 5.0 / 1.975;
  vec4 n = fbmd(p * k, 2);
  return vec4(0.5 + 0.5 * n.x, 0.5 * k * n.yzw);
}`;
const HEIGHT_SHARP = `vec4 iceHeight(vec3 p) {
  const float k = 5.0 / 1.975;
  vec4 n = fbmd(p * k, 3);
  // Ridged chips at 2.2x the scale: angular breaks along the outline (carved, not a smooth wave).
  vec4 c = noised(p * (k * 2.2) + 17.0);
  float r = 1.0 - abs(c.x);
  vec3 rg = -sign(c.x) * c.yzw * (k * 2.2);
  float h = 0.5 + 0.42 * n.x - 0.3 * (r * r - 0.45);
  vec3 g = 0.42 * k * n.yzw - 0.3 * 2.0 * r * rg;
  return vec4(h, g);
}`;
const DISP_END = `    n = normalize(n - (hg.yzw - n * dot(hg.yzw, n)) * uDisplace * 0.18);
  }`;
const DISP_END_T = `    n = normalize(n - (hg.yzw - n * dot(hg.yzw, n)) * uDisplace * 0.18);
    // Broken ends (QC round 8): a tangential field along the ring. The side faces slide along themselves; the cut faces
    // become uneven (+-4.5 cm). Same field for every vertex, so caps and sides stay welded.
    vec3 tangT = vec3(-pr.y, pr.x, 0.0);
    float tl = length(tangT);
    if (tl > 1e-4) pos += (tangT / tl) * vnoise(pr * (3.4 / 1.975) + 31.0) * 0.045;
  }`;
export default {
  sub1: { js: SUBDIV_JS },
  sil1: { js: SUBDIV_JS, vert: [[HEIGHT, HEIGHT_SHARP], [DISP_END, DISP_END_T]] },
  sil2: { js: SUBDIV_JS, vert: [[HEIGHT, HEIGHT_SHARP], [DISP_END, DISP_END_T]], uniforms: { uDisplace: 0.05 * 1.975 * 1.35 } },
  // Last at every pose: puts the original meshes back for the next pose's "none".
  zbase: { js: RESTORE_JS },
};
