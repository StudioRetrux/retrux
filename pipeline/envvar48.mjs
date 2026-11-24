// Ridge specks, take 2: the rest projector's crack test (round 4, T06) already hands a fragment seen through a proxy crack
// the occluder's texel, but in the blend an extra projector that sees the hidden massif point from its own spot (orbN /
// hold / tilt: parallax) "wins it even with a small proximity weight" and paints the massif's snow back into the crack.
// c1: a crack (current camera ray meets the rest projector's occluder) counts as seen by the rest plate (vis 1) and takes
// no extra-projector weight.
const A = "  if (uPlateDepthOn > 0.5) {\n    float oz0 = ";
const A_N = "  float crackK = 0.0;\n  if (uPlateDepthOn > 0.5) {\n    float oz0 = ";
const B = "        uv = uv0;\n        nofill = 0.0;";
const B_N = "        uv = uv0;\n        nofill = 0.0;\n        crackK = 1.0;";
const C = "    float w0 = max(uRestMix, 0.001) * (vis1 + 0.02);";
const C_N = "    float w0 = max(uRestMix, 0.001) * (max(vis1, crackK) + 0.02);";
const W = (P) => [`    float wK = u${P}Mix * visK * inK;`, `    float wK = u${P}Mix * visK * inK * (1.0 - crackK);`];
export default {
  c1: { plate: [[A, A_N], [B, B_N], [C, C_N], W("Hold"), W("OrbN"), W("OrbP"), W("Tilt")] },
  // Debug: crackK in red over the build.
  dc: { plate: [[A, A_N], [B, B_N], ["  gl_FragColor = vec4(mix(col, mix(MIST_COLOR * vec3(0.81, 0.9, 1.0), footC, ridgeFoot), min(mist, 0.85)), 1.0);", "  gl_FragColor = vec4(mix(col, mix(MIST_COLOR * vec3(0.81, 0.9, 1.0), footC, ridgeFoot), min(mist, 0.85)), 1.0);\n  if (crackK > 0.5) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);"]] },
};
