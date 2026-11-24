// T15 / rest: band A sits ~12-15 px too high at rest (q00 vs F000: front face 331-407 vs 347-417; orb glow above it
// 21 vs 37 px). A tip of A alone at t 0 (the build now tips B / C at t 0.5: loopTipDeg [0, 13, 20, 0]).
const A = (deg) => ({ tune: { loopTipDeg: [deg, 13, 20, 0], loopTipAt: [0, 0.5, 0.5, 0.5], loopTipWidth: 0.45 } });
export default {
  Ap3: A(3),
  Am3: A(-3),
  Ap5: A(5),
};
