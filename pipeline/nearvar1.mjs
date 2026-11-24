// Round 7 grade / env: the near foreground (rocks and snow 6-15 m out) is crisp and deep ultramarine with crushed blacks
// (corner BL 39,75,119 vs F000 60,89,125); the reference's foreground is soft (defocused) and a lighter blue-grey.
// n1 near DOF (plate + lake), n2 near shadow lift / desaturation, n3 both.
const LODP = "float lodDof = uDofBlur * smoothstep(0.0, uFocusRange, abs(d - uFocusDist));";
const LODW = "float lodX = uDofBlur * smoothstep(0.0, 30.0, abs(dist - uFocusDist));";
const GRADE = "col = envChroma(plateGrade(col));";
const dofP = [LODP, "float lodDof = uDofBlur * smoothstep(0.0, uFocusRange, abs(d - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0, 16.0, d));"];
const dofW = [LODW, "float lodX = uDofBlur * smoothstep(0.0, 30.0, abs(dist - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0, 16.0, dist));"];
const lift = [GRADE, `${GRADE}
  {
    // Near shadows: lighter, less saturated (F000's foreground is a soft blue-grey, not ultramarine).
    float nearK = (1.0 - smoothstep(12.0, 22.0, d)) * uPlateDepthOn;
    float ln = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float shK = nearK * (1.0 - smoothstep(0.05, 0.35, ln));
    col = mix(col, mix(vec3(ln), col, 0.7) * 1.25 + vec3(0.006, 0.008, 0.01), shK * 0.8);
  }`];
export default {
  n1: { plate: [dofP], water: [dofW] },
  n2: { plate: [lift] },
  n3: { plate: [dofP, lift], water: [dofW] },
};
