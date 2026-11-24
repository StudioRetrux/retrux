// Round 7 env / grade / Awwwards: the hold fog bank is far too thin and too white (F420's billowy grey-blue bank swallows
// the lower ~45 % of the mountain), the far mountains lack the blue veil. plateBank height 0.8-6 m -> taller, the colour
// greyer-blue and denser. Plate + lake (same function and mix).
const H = "(1.0 - smoothstep(0.8, 6.0, p.y))";
const MIXP = "col = mix(col, uFogColor * vec3(0.49, 0.59, 0.68), min(plateBank(d, fp, uFogHold, uTime) * 0.6, 0.55));";
const MIXW = "base = mix(base, uFogColor * vec3(0.49, 0.59, 0.68), min(plateBank(dist, vWorldPos, uFogHold, uTime) * 0.6, 0.55));";
const height = (a, b) => [H, `(1.0 - smoothstep(${a.toFixed(1)}, ${b.toFixed(1)}, p.y))`];
const colour = (c, k, cap) => [
  [MIXP, `col = mix(col, uFogColor * vec3(${c}), min(plateBank(d, fp, uFogHold, uTime) * ${k.toFixed(2)}, ${cap.toFixed(2)}));`],
];
const colourW = (c, k, cap) => [
  [MIXW, `base = mix(base, uFogColor * vec3(${c}), min(plateBank(dist, vWorldPos, uFogHold, uTime) * ${k.toFixed(2)}, ${cap.toFixed(2)}));`],
];
export default {
  h12: { plate: [height(0.8, 12)], water: [height(0.8, 12)] },
  h12c: { plate: [height(0.8, 12), ...colour("0.44, 0.54, 0.66", 0.75, 0.68)], water: [height(0.8, 12), ...colourW("0.44, 0.54, 0.66", 0.75, 0.68)] },
  h18c: { plate: [height(1.0, 18), ...colour("0.44, 0.54, 0.66", 0.75, 0.68)], water: [height(1.0, 18), ...colourW("0.44, 0.54, 0.66", 0.75, 0.68)] },
};
