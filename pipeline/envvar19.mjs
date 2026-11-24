// Round 6 env: the far-shore mist band is too bright, ~35-40 px too high, with a straight top edge (its height falloff is
// a level line on the slopes). Height perturbed by the wisp noise, a smaller scale height, a little less of it.
const CALL = "float mist = plateMist(d, fp.y) * wisp * shade;";
const FN = "return smoothstep(35.0, 70.0, d) * exp(-max(y, 0.0) / 1.6) * 0.45;";
export default {
  wavy: { plate: [[CALL, "float mist = plateMist(d, fp.y - (wisp - 1.0) * 1.4) * wisp * shade;"]] },
  wavyLow: { plate: [[CALL, "float mist = plateMist(d, fp.y - (wisp - 1.0) * 1.4) * wisp * shade;"], [FN, "return smoothstep(35.0, 70.0, d) * exp(-max(y, 0.0) / 1.1) * 0.38;"]] },
  wavyLower: { plate: [[CALL, "float mist = plateMist(d, fp.y - (wisp - 1.0) * 1.2) * wisp * shade;"], [FN, "return smoothstep(35.0, 70.0, d) * exp(-max(y, 0.0) / 0.8) * 0.34;"]] },
};
