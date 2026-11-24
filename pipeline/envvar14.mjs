// T03: the navy ridge mask is a rectangle in plate space (rest frame x 0.066-0.116, y 0.40-0.74), whose vertical right
// edge reads as a curtain at rest; the reference's ridge flank is a diagonal. Geometry-following mask: a wide left
// region, gated by the ridge's own depth band (~78-96 m: no near rocks, no massif behind) and its height above the floes.
const AREA = "return (1.0 - smoothstep(0.066, 0.116, f.x)) * smoothstep(0.4, 0.4625, f.y) * (1.0 - smoothstep(0.675, 0.7375, f.y));";
const GATE = "ridge *= step(pz, 300.0) * (1.0 - smoothstep(96.0, 100.0, min(pz, fz))) * uPlateDepthOn;";
const SHADE = "float shade = 1.0 - ridge * 0.9;";
const geo = (x0, x1, h0, h1) => [
  [AREA, `return 1.0 - smoothstep(${x0.toFixed(3)}, ${x1.toFixed(3)}, f.x);`],
  [GATE, `ridge *= step(pz, 300.0) * smoothstep(70.0, 78.0, min(pz, fz)) * (1.0 - smoothstep(96.0, 100.0, min(pz, fz))) * smoothstep(${h0.toFixed(1)}, ${h1.toFixed(1)}, vWorldPos.y) * uPlateDepthOn;`],
];
export default {
  geo30: { plate: [...geo(0.24, 0.32, 0.8, 3.0)] },
  geo30s: { plate: [...geo(0.24, 0.32, 0.8, 3.0), [SHADE, "float shade = 1.0 - ridge * 0.5;"]] },
};
