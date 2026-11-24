// T03 round 2: geo30's ridge foot (lower left) stayed pale in orbit views: nearer than the 70-78 m ramp. Near bound 50-60 m.
const AREA = "return (1.0 - smoothstep(0.066, 0.116, f.x)) * smoothstep(0.4, 0.4625, f.y) * (1.0 - smoothstep(0.675, 0.7375, f.y));";
const GATE = "ridge *= step(pz, 300.0) * (1.0 - smoothstep(96.0, 100.0, min(pz, fz))) * uPlateDepthOn;";
const SHADE = "float shade = 1.0 - ridge * 0.9;";
const geo = (n0, n1) => [
  [AREA, "return 1.0 - smoothstep(0.24, 0.32, f.x);"],
  [GATE, `ridge *= step(pz, 300.0) * smoothstep(${n0.toFixed(1)}, ${n1.toFixed(1)}, min(pz, fz)) * (1.0 - smoothstep(96.0, 100.0, min(pz, fz))) * smoothstep(0.8, 3.0, vWorldPos.y) * uPlateDepthOn;`],
  [SHADE, "float shade = 1.0 - ridge * 0.5;"],
];
export default {
  geo50: { plate: geo(50, 60) },
  geo40: { plate: geo(40, 50) },
};
