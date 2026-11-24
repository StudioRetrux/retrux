// The base mist band is baked in the plate (shader mist does not move box 150-450 x 385-425: 154,169,190 vs F000
// 138,155,181). Stronger de-haze, its upper boundary broken by the wisp noise (the band's top read as a level line).
const DH_GATE = "float baseK = smoothstep(55.0, 80.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * (1.0 - smoothstep(4.0, 14.0, fp.y)) * smoothstep(0.4, 1.6, fp.y);";
const DH_MUL = "col = mix(col, col * vec3(0.52, 0.62, 0.78), baseK);";
const gateNoisy = [DH_GATE, "float hN = fp.y + (plateMistWisp(fp, uTime) - 1.0) * 3.0;\n    float baseK = smoothstep(55.0, 80.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * (1.0 - smoothstep(3.0, 12.0, hN)) * smoothstep(0.4, 1.6, fp.y);"];
export default {
  noisy: { plate: [gateNoisy] },
  noisyStrong: { plate: [gateNoisy, [DH_MUL, "col = mix(col, col * vec3(0.44, 0.54, 0.72), baseK);"]] },
};
