// = icevar71 for probe_icevar (pinned poses). t1: wavy soft TIR bar, half-width 4 cm; t2: 3 cm; t3: t2 with the bar's colour
// darker and less saturated (F000's inner-wall lines are dark slate, ~70,100,140, not cobalt).
const OLD_BAR = "  float tirBar = smoothstep(-0.13 - tbAA, -0.13 + tbAA, tbX) * (1.0 - smoothstep(-0.02 - tbAA, -0.02 + tbAA, tbX)) * tbOn;\n  float tirZone = smoothstep(-tbAA, tbAA, tbX) * tbOn;";
const NEW_BAR = (hw) => `  float tbXw = tbX + b1.x * 0.018 + (nA - 0.5) * 0.045;
  float tirBar = (1.0 - smoothstep(0.0, 1.0, abs(tbXw + 0.055) / ${hw})) * tbOn;
  float tirZone = smoothstep(-tbAA - 0.01, tbAA + 0.01, tbXw) * tbOn;`;
const COL = "  body = mix(body, vec3(0.14, 0.27, 0.68) * (0.6 + 0.4 * irr.b), tirBar * 0.8);";
const COL_N = "  body = mix(body, vec3(0.09, 0.17, 0.36) * (0.6 + 0.4 * irr.b), tirBar * 0.8);";
export default {
  t1: { frag: [[OLD_BAR, NEW_BAR("0.04")]] },
  t2: { frag: [[OLD_BAR, NEW_BAR("0.03")]] },
  t3: { frag: [[OLD_BAR, NEW_BAR("0.03")], [COL, COL_N]] },
};
