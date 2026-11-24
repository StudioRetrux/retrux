// Round-10 hold-sweep MAJOR "straight dark-blue seam bars through the ice rings": not the thickness pass (icevar70 k1: the
// bar stays with the caps out of it); it is the analytic TIR bar (round 6-7: F000's dark steel inner-wall lines at the band
// ends). F000's lines are thin, dark and wavy (they follow the lumpy ice); ours a 9-20 px uniform, straight, flat-edged bar
// -> reads as a mesh / UV seam (sw_intro_3, sw_tau_2.75, sw_pop_B, sw_hold_L).
//  t1: the bar's coordinate wobbles with the surface noise (+-~3.5 cm), a soft tent profile centred at -5.5 cm, half-width
//      4 cm (was a flat [-13, -2] cm), and the frosted end block's edge follows the same wobble.
//  t2: as t1, half-width 3 cm.
export const reset = "";
const OLD_BAR = "  float tirBar = smoothstep(-0.13 - tbAA, -0.13 + tbAA, tbX) * (1.0 - smoothstep(-0.02 - tbAA, -0.02 + tbAA, tbX)) * tbOn;\n  float tirZone = smoothstep(-tbAA, tbAA, tbX) * tbOn;";
const NEW_BAR = (hw) => `  float tbXw = tbX + b1.x * 0.018 + (nA - 0.5) * 0.045;
  float tirBar = (1.0 - smoothstep(0.0, 1.0, abs(tbXw + 0.055) / ${hw})) * tbOn;
  float tirZone = smoothstep(-tbAA - 0.01, tbAA + 0.01, tbXw) * tbOn;`;
const FRONT = (pairs) => `
  const P = ${JSON.stringify(pairs)};
  for (const m of h.rings.materials) {
    if (!m.userData.orig) m.userData.orig = m.fragmentShader;
    let s = m.userData.orig;
    for (const [a, b] of P) { if (!s.includes(a)) console.error("missing " + a.slice(0, 60)); s = s.replace(a, b); }
    m.fragmentShader = s;
    m.needsUpdate = true;
  }
`;
export default {
  t1: { js: FRONT([[OLD_BAR, NEW_BAR("0.04")]]) },
  t2: { js: FRONT([[OLD_BAR, NEW_BAR("0.03")]]) },
};
