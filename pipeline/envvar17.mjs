// T03 follow-up 2: F000's ridge is dark down to the shore only at the far left (x < ~120 px); further right its foot
// fades into pale mist. Height gate by x: none at the far left (rest frame x < 0.08), the 0.8-3 m gate from x 0.14.
const GATE = "smoothstep(0.8, 3.0, vWorldPos.y)";
export default {
  gx: { plate: [[GATE, "mix(smoothstep(0.1, 0.5, vWorldPos.y), smoothstep(0.8, 3.0, vWorldPos.y), smoothstep(0.08, 0.14, restFrame(uv0).x))"]] },
  gx2: { plate: [[GATE, "mix(smoothstep(0.1, 0.5, vWorldPos.y), smoothstep(0.8, 3.0, vWorldPos.y), smoothstep(0.1, 0.18, restFrame(uv0).x))"]] },
};
