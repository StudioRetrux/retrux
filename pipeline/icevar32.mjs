// Ice batch 32 (round 6 plan T10 + T11 on top of icevar31 c5 colour).
// T10: planar chisel chips (no cone dimple, 0.16 planar tilt, crisp borders, smaller cells), 70 % less low-frequency
// undulation (vertex normal 0.6 -> 0.18, broad bump 0.07 -> 0.02), no march jitter (stipple), fewer crack veins.
// T11: analytic inner-wall TIR bar (the refracted ray grazing the inner radius), steel-blue long paths at 0.28 with a
// pale frosted share, TIR only on the inner wall, a softer band navy, chroma clamp.
import C from "./icevar31.mjs";
const c5 = C.c5;
const T10 = [
  ["vec3 tilt = (t * rnd.x + b * rnd.y) * 0.08 + offT / max(length(offT), 1e-4) * 0.14 * smoothstep(0.0, 0.08, length(offT));", "vec3 tilt = (t * rnd.x + b * rnd.y) * 0.16;"],
  ["float keep = smoothstep(0.0, 0.12 + aa, e);", "float keep = smoothstep(0.0, 0.04 + aa, e);"],
  ["vec3 g = (b1.yzw * (0.07 * (0.35 + 0.65 * frost))", "vec3 g = (b1.yzw * (0.02 * (0.35 + 0.65 * frost))"],
  ["float jitter = 0.5 + 0.35 * (ign(gl_FragCoord.xy, 0.0) - 0.5);", "float jitter = 0.5;"],
];
const cell = (k) => [["const float CELL = 5.0 / 1.975;", `const float CELL = ${k.toFixed(1)} / 1.975;`]];
const vCell = (k) => [["vec2 v = voronoi3(objP * (5.0 / 1.975), off);", `vec2 v = voronoi3(objP * (${k.toFixed(1)} / 1.975), off);`]];
const VT10 = [["n = normalize(n - (hg.yzw - n * dot(hg.yzw, n)) * uDisplace * 0.6);", "n = normalize(n - (hg.yzw - n * dot(hg.yzw, n)) * uDisplace * 0.18);"]];
const BODY = "vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.5;";
const T11 = [
  ["uniform vec2 uSectionHalf;\nvarying vec3 vWorldPos;", "uniform vec2 uSectionHalf;\nuniform float uSectionRadius;\nuniform float uObjScale;\nvarying vec3 vWorldPos;"],
  [BODY, `${BODY}
  // TIR bar: the refracted ray grazing the inner wall (closest approach of its in-plane line to the ring axis = the inner
  // radius), heading inwards, on thick ice (F000's dark steel bars at ~0.69 R).
  vec2 p2b = vObjPos.xy / max(uObjScale, 1e-4);
  vec2 d2b = objRd.xy;
  float lenDb = length(d2b);
  float dminB = abs(p2b.x * d2b.y - p2b.y * d2b.x) / max(lenDb, 1e-4);
  float rInB = uSectionRadius - uSectionHalf.x;
  float tirBar = (1.0 - smoothstep(0.0, 0.22 * uSectionHalf.x + fwidth(dminB), abs(dminB - rInB))) * step(dot(p2b, d2b), 0.0) * smoothstep(0.25, 0.5, lenDb) * thick;
  body = mix(body, vec3(0.20, 0.33, 0.54) * (0.55 + 0.45 * irr.b), tirBar * 0.75);`],
  ["body = mix(body, vec3(0.065, 0.16, 0.39) * (0.5 + 0.5 * irr.b), max(band * mix(0.25, 0.38, innerW), tir * mix(0.15, 0.22, innerW)));", "body = mix(body, vec3(0.12, 0.22, 0.42) * (0.5 + 0.5 * irr.b), max(band * mix(0.25, 0.38, innerW), tir * innerW * 0.08));"],
  ["body = mix(body, vec3(0.066, 0.162, 0.392) * (0.6 + 0.4 * irr.b), pathK * 0.45);", `body = mix(body, vec3(0.21, 0.35, 0.57) * (0.6 + 0.4 * irr.b), pathK * 0.28);
  body = mix(body, scatterLight, 0.18 * pathK);
  body = mix(body, vec3(dot(body, vec3(0.2126, 0.7152, 0.0722))) + (body - vec3(dot(body, vec3(0.2126, 0.7152, 0.0722)))) * 0.8, smoothstep(0.3, 0.5, max(band, pathK)));`],
  ["F *= mix(0.25, 1.0, sil);", "F *= mix(0.25, 1.0, sil);\n  F *= 1.0 - 0.8 * tirBar;"],
];
export default {
  s1: { frag: [...c5.frag, ...T10, ...cell(9)], vert: [...VT10, ...vCell(9)], uniforms: { ...c5.uniforms, uCrack: 0.6 } },
  s2: { frag: [...c5.frag, ...T10, ...cell(9), ...T11], vert: [...VT10, ...vCell(9)], uniforms: { ...c5.uniforms, uCrack: 0.6 } },
  s3: { frag: [...c5.frag, ...T10, ...cell(7), ...T11], vert: [...VT10, ...vCell(7)], uniforms: { ...c5.uniforms, uCrack: 0.6 } },
  b1: { frag: [...c5.frag, ...T11], uniforms: c5.uniforms },
};
