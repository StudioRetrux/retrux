// T15 (q01, loop t 0.5): which ring is the band across the orb, and which tip matches the reference (band ~157 px
// tall, the orb inside it, ~27 deg)? (loopTipAt is per ring now.)
const hide = (i) => ({ js: `h.rings.groups[${i}].visible = false;` });
const tip = (arr) => ({ tune: { loopTipDeg: arr, loopTipAt: [0.5, 0.5, 0.5, 0.5], loopTipWidth: 0.3 } });
export default {
  hideB: hide(1),
  hideC: hide(2),
  hideD: hide(3),
  tipB13: tip([0, 13, 0, 0]),
  tipBm13: tip([0, -13, 0, 0]),
  tipD13: tip([0, 0, 0, 13]),
  tipC20: tip([0, 0, 20, 0]),
};
