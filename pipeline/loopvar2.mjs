// T15 round 2: tipB13 made B the reference's bowl (far rim across the orb's upper half); F015 shows two stacked far rims
// (outer 293-307, inner 307-340) and the inner ring's near rim at y ~372 at x 720. Combos, and the bump width.
const tip = (arr, w = 0.3) => ({ tune: { loopTipDeg: arr, loopTipAt: 0.5, loopTipWidth: w } });
export default {
  B13C20: tip([0, 13, 20, 0]),
  B18C20: tip([0, 18, 20, 0]),
  B13C20D10: tip([0, 13, 20, 10]),
  B13C20w45: tip([0, 13, 20, 0], 0.45),
};
