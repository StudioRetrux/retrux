// Round-9 plan T01 step 3: proxy faces lying at y ~ 0 z-fight with the y = 0 water quads (dotted / stair-stepped
// waterline edges at the frame bottom). po: polygonOffset on the water material so the proxies win depth ties.
export const reset = "const m = h.water.material; m.polygonOffset = false; m.polygonOffsetFactor = 0; m.polygonOffsetUnits = 0; m.needsUpdate = true;";
export default {
  po: { js: "const m = h.water.material; m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 2; m.needsUpdate = true;" },
  po4: { js: "const m = h.water.material; m.polygonOffset = true; m.polygonOffsetFactor = 2; m.polygonOffsetUnits = 4; m.needsUpdate = true;" },
};
