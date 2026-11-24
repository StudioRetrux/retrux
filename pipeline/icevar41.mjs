// Ice batch 41: the analytic TIR bar, redone (round 6 T11). Patches against the CURRENT IceMaterial.ts (c5 / T10 / k1 /
// f1 / uLens 0.35 baked). Standalone: no imports from older batches.
//
// Why icevar32's bar never fired (tirBar = 0 everywhere): no frame / scale / offset bug. vObjPos is ring-frame metres
// (uNoiseOffset undoes the centroid re-centring, uObjScale is 1) and vObjView / vObjNormal are mesh-local, i.e. the ring
// frame shifted by the centroid (pivot at the centroid, identity rotation at rest). The test itself cannot be met:
// refraction at the outer wall (radial normal) keeps n (p x d).z, so the internal ray's closest approach to the axis is
// dmin = b / n <= rOut / n (ring A: 2.401 / 1.31 = 1.83 m), always inside rIn = 1.98 m (and the same on B / C / D:
// rOut / rIn ~1.21 < n). TIR at the inner wall starts at dmin = rIn / n. With n d.z also kept, that is exactly
// b = rIn for the UNREFRACTED line of sight, whatever n and the tilt, so the bars sit on the inner wall's silhouette
// (q00: +-150..159 px from the orb at x 721, i.e. frame x ~562-571 / 871-880).
// dbg2's "R ~0.4" was AgX crosstalk: linear (0, 1.1, 1.0) displays as ~(0.55, 0.81, 0.80). So R = 0 there,
// uSectionRadius ~2.19 and secA ~0.21.
//
// One new varying, vCamRing (the camera in the ring frame, constant per piece), makes the line of sight exact. vObjPos
// is the UNDISPLACED point while vObjView aims at the displaced vertex. A line built from those two sits up to ~5 cm
// off the real one, which would make the bar wobble by about +-3 px.
//
// Run on q00 first:   node probe_icevar.mjs <out> icevar41.mjs d41bar,d41iso,t41a q00
// then, if it lands:  node probe_icevar.mjs <out> icevar41.mjs t41b,t41w q00,p06

const f3 = (x) => x.toFixed(3);

// Vertex: the camera in the ring frame. The back-depth program gets the same vertex stage: an unused output there is fine.
const VERT = [
  [
    "varying vec2 vSec;   // position across the slab section",
    "varying vec3 vCamRing;  // icevar41: camera, ring frame, mesh units (constant per piece)\nvarying vec2 vSec;   // position across the slab section",
  ],
  ["vObjView = (camObj - pos) * uObjScale;", "vObjView = (camObj - pos) * uObjScale;\n  vCamRing = camObj + uNoiseOffset;"],
];

const DECL = ["uniform float uOrbGlow;", "uniform float uOrbGlow;\nuniform float uSectionRadius;\nuniform float uObjScale;\nvarying vec3 vCamRing;"];
const BODY = "vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.5;";
const EDGE = "body += scatterLight * edgeMask * (0.008 + 0.012 * cellRand);";
const SIL = "F *= mix(0.25, 1.0, sil);";
const TIR = "float tir = smoothstep(0.5, 0.85, 1.0 - dot(Nr, V)) * thick * smoothstep(0.06, 0.22, NdotV);";
const PATHK = "float pathK = smoothstep(1.2, 2.5, t / (2.0 * max(max(uSectionHalf.x, uSectionHalf.y), 1e-3)));";
const OUT = "gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);";

// Bar profile in x = bView - rIn (m; ~80 px per m at the rest framing): dark from inner (ramping in over soft) to the
// crisp outer edge, anti-aliased with fwidth. tirZone = x > 0 (total reflection at the inner wall).
const geom = ({ inner, soft = 0, outer }) => [
  BODY,
  `${BODY}
  // icevar41 TIR bar (ring frame, axis +Z, mesh units). A wall whose normal has no axial part keeps n (p x d).z and n d.z
  // through refraction, so a ray entering through the OUTER wall meets the inner wall past the critical angle exactly
  // where its unrefracted line of sight passes the axis farther out than rIn. The bar is the strip just inside that
  // boundary (grazing exit: Fresnel -> 1, a long skim through the ice): the inner wall's silhouette, straight whatever
  // the facets do. Past it the ray is totally reflected: the reference's frosted end blocks.
  vec3 tbI = -normalize(vObjView);
  float tbLenI2 = max(length(tbI.xy), 1e-4);
  float tbB = abs(vCamRing.x * tbI.y - vCamRing.y * tbI.x) / tbLenI2;
  float tbRin = uSectionRadius - uSectionHalf.x;
  float tbX = tbB - tbRin;
  float tbAA = fwidth(tbB) + 1e-4;
  vec2 tbP = vObjPos.xy / max(uObjScale, 1e-4);
  float tbR = max(length(tbP), 1e-4);
  // Entered through the outer wall (radial normal: not an axial face, chamfer or cut face), on the near side (inwards).
  float tbOuter = smoothstep(0.55, 0.8, dot(normalize(vObjNormal).xy, tbP / tbR));
  float tbHead = 1.0 - smoothstep(-0.25, -0.05, dot(tbP, tbI.xy) / (tbR * tbLenI2));
  // Still inside the slab when it reaches the inner radius (a tilted ring's ray can leave through an axial face first).
  float tbDz = tbI.z / uIor;
  float tbD2 = sqrt(max(1.0 - tbDz * tbDz, 1e-4));
  float tbBi = tbB * tbLenI2 / (uIor * tbD2);
  float tbRun = sqrt(max(tbR * tbR - tbBi * tbBi, 0.0)) - sqrt(max(tbRin * tbRin - tbBi * tbBi, 0.0));
  float tbZ = vObjPos.z / max(uObjScale, 1e-4) + tbDz / tbD2 * tbRun;
  float tbOn = tbOuter * tbHead * (1.0 - smoothstep(0.97, 1.03, abs(tbZ) / max(uSectionHalf.y, 1e-3))) * smoothstep(0.08, 0.2, tbLenI2);
  float tirBar = smoothstep(${f3(inner - soft)} - tbAA, ${f3(inner)} + tbAA, tbX) * (1.0 - smoothstep(${f3(outer)} - tbAA, ${f3(outer)} + tbAA, tbX)) * tbOn;
  float tirZone = smoothstep(-tbAA, tbAA, tbX) * tbOn;`,
];

// The reference bar is ~125,155,193; this target lands ~130,160,196 after AgX at irr.b ~1 with 20 % of the body left.
const STEEL = "vec3(0.14, 0.27, 0.68) * (0.6 + 0.4 * irr.b)";
const bar = (k) => `
  // icevar41: the TIR bar in the reference's steel blue.
  body = mix(body, ${STEEL}, tirBar * ${f3(k)});`;
const FROST = `
  // icevar41 t41b: past the boundary the eye gets light that bounced off the inner wall and left through frosted faces:
  // milky end blocks either side of the dark walls (the old grazing navy and long-path navy are cut there).
  body = mix(body, scatterLight * 1.1 + vec3(0.456, 0.578, 0.776) * irr * 0.3, tirZone * 0.3);`;
const lessF = [SIL, `${SIL}\n  F *= 1.0 - 0.6 * tirBar;`];
const ENDS = [
  [TIR, `${TIR.slice(0, -1)} * (1.0 - 0.7 * tirZone);`],
  [PATHK, `${PATHK.slice(0, -1)} * (1.0 - 0.6 * tirZone);`],
];
const ISO = `// icevar41 debug, AgX-proof (each channel 0 or 3). R: iso-lines of bView / rIn every 0.1 (camera-exact line of sight).
  // G: the same from icevar32's refracted ray, n (p x d).z / |I.xy| (equal for a radial entry normal; up to ~3 px off from
  // the undisplaced p and the vertex-normal wobble). B: the TIR side (bView > rIn). Only on outer-wall entries heading
  // inwards; the render at half brightness elsewhere.
  float tbRefr = uIor * abs(tbP.x * objRd.y - tbP.y * objRd.x) / tbLenI2;
  vec3 tbDbg = 3.0 * vec3(step(0.5, fract(tbB / tbRin * 10.0)), step(0.5, fract(tbRefr / tbRin * 10.0)), step(0.0, tbX));
  gl_FragColor = vec4(mix(min(col, vec3(24.0)) * 0.5, tbDbg, step(0.5, tbOn)), 1.0);`;

// ~9 px at q00: x in [-0.13, -0.02] m, i.e. 150-159 px from the orb (the reference's right bar is 870-879, i.e. 149-158).
const A = { inner: -0.13, outer: -0.02 };
// ~15-17 px, darkening towards the boundary, crisp outer edge.
const W = { inner: -0.08, soft: 0.14, outer: -0.012 };

export default {
  // Debug: the bar in pure black over the normal render.
  d41bar: { vert: VERT, frag: [DECL, geom(A), [OUT, "gl_FragColor = vec4(mix(min(col, vec3(24.0)), vec3(0.0), tirBar), 1.0);"]] },
  // Debug: iso-stripes of the impact parameter (camera-exact vs icevar32's refracted ray x n) and the TIR side.
  d41iso: { vert: VERT, frag: [DECL, geom(A), [OUT, ISO]] },
  // The fix: crisp steel-blue bar.
  t41a: { vert: VERT, frag: [DECL, geom(A), [EDGE, EDGE + bar(0.8)], lessF] },
  // + frosted TIR end blocks.
  t41b: { vert: VERT, frag: [DECL, geom(A), ...ENDS, [EDGE, EDGE + bar(0.8) + FROST], lessF] },
  // Wider, softer-inside, stronger bar.
  t41w: { vert: VERT, frag: [DECL, geom(W), [EDGE, EDGE + bar(0.9)], lessF] },
};
