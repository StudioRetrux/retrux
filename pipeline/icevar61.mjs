// Round-9 plan T11a: prism zones. Extra bending of the ring's wall curvature ONLY where the shell fix keeps it (macroW:
// grazing faces and section corners), so those zones sample the darker lake / inverted horizon or the sky, while the
// face-on band in front of the orb stays unchanged (icevar60's partial macro lens on face-on parts flattened it again).
const RD = "  vec3 rdG = normalize(-V - tilt * lens);";
const rd = (lp) => `  vec3 rdG = normalize(-V - tilt * lens - tiltMacro * macroW * (${lp} - lens));`;
export default {
  lp07: { frag: [[RD, rd("0.7")]] },
  lp10: { frag: [[RD, rd("1.0")]] },
  lp14: { frag: [[RD, rd("1.4")]] },
};
