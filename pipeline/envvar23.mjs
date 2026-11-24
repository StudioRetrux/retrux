// v4 plates published (base mist lower / dimmer / bluer in all five). Slope haze over the far mountains' lower slopes
// (box 150-450 x 340-385 read 142 vs F000 157 in the envv4 test) at 0.15 / 0.25 / 0.35.
const FOG = "  float fog = smoothstep(uFog.x, uFog.y, d)";
const haze = (k) => [FOG, `  float slopeH = smoothstep(100.0, 160.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * smoothstep(1.5, 4.0, fp.y) * (1.0 - smoothstep(10.0, 22.0, fp.y)) * uPlateDepthOn;
  col = mix(col, uFogColor * vec3(0.9, 0.95, 1.02), slopeH * ${k.toFixed(2)});
${FOG}`];
export default {
  h15: { plate: [haze(0.15)] },
  h25: { plate: [haze(0.25)] },
  h35: { plate: [haze(0.35)] },
};
