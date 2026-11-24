// T03 follow-up: the ridge mask's height gate (0.8-3 m) cut the navy off above the ridge's foot (a horizontal edge, mid
// left +30 levels vs F000, where the ridge stays dark to the shore). Lower gates that still leave the floe tops (~0.3-0.5 m).
const GATE = "smoothstep(0.8, 3.0, vWorldPos.y)";
export default {
  g4_12: { plate: [[GATE, "smoothstep(0.4, 1.2, vWorldPos.y)"]] },
  g2_8: { plate: [[GATE, "smoothstep(0.2, 0.8, vWorldPos.y)"]] },
};
