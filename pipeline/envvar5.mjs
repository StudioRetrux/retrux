// Vertical-orbit ghosts: the occlusion fill searches horizontally first, but a parallax reveal lies towards the
// epipole (the camera's projection in the projector image): up for a raised camera, inwards for a dolly. Orient it.
const SX = "vec2 sx = vec2(uPlateDepthTexel.x * 4.0, 0.0);";
const SY = "vec2 sy = vec2(0.0, uPlateDepthTexel.y * 4.0);";
const ORIENT = `vec4 ecl = uPlateViewProjF * vec4(cameraPosition, 1.0);
  vec2 edir = (ecl.xy - (uv * 2.0 - 1.0) * ecl.w) / uPlateDepthTexel;
  edir = dot(edir, edir) > 1e-10 ? normalize(edir) : vec2(-1.0, 0.0);
  vec2 sx = -edir * uPlateDepthTexel * 4.0;`;
const ORIENT_Y = "vec2 sy = vec2(-edir.y, edir.x) * uPlateDepthTexel * 4.0;";
const B1 = "vec2 b = uv + sx * s;";
export default {
  orient: { plate: [[SX, ORIENT], [SY, ORIENT_Y]] },
  orient_strict: { plate: [[SX, ORIENT], [SY, ORIENT_Y], [B1, "vec2 b = uv - sx * (s - 0.5);"]] },
};
