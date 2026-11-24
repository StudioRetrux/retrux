// Glitch batch 5: wlod (extra projectors sample at the DOF lod) + the rest projector's "raised" test for every extra
// projector on the lake: the x1.06 + 0.8 m depth tolerance and the 2.5 m soft ramp let a projector whose lookup landed on
// a near rock / floe paint it on the water beside it (rel_R: a dark rock-coloured slab right of the left rock).
export const reset = "h.rig.holdOrbitEnd = 0.35;";
const P = [["Hold", "hold"], ["OrbN", "orbN"], ["OrbP", "orbP"], ["Tilt", "tilt"]];
const lod = [
  ["float lod = uDofBlur * smoothstep(0.0, 30.0, abs(dist - uFocusDist)) + 5.0 * raised;", "float lodX = uDofBlur * smoothstep(0.0, 30.0, abs(dist - uFocusDist));\n  float lod = lodX + 5.0 * raised;"],
  ...P.map(([p]) => [`acc += textureLod(u${p}Plate, kq, lod)`, `acc += textureLod(u${p}Plate, kq, lodX)`]),
];
const raised = P.map(([p, q]) => [`float wK = u${p}Mix * visK * inK;`, `if (awayK > 0.02) {
        float kdz = ${q}DepthAt(clamp(k, vec2(0.0), vec2(1.0)));
        float kfz = -(u${p}View * vec4(kpw, 1.0)).z;
        vec3 kseen = u${p}CamPos + (kpw - u${p}CamPos) * (kdz / max(kfz, 1e-3));
        visK *= 1.0 - smoothstep(0.05, 0.12, kseen.y - kpw.y) * (1.0 - smoothstep(40.0, 60.0, kfz));
      }
      float wK = u${p}Mix * visK * inK;`]);
const cov = (a, b) => P.map(([p]) => [`extraCover += u${p}Mix * inK * visK;`, `extraCover = max(extraCover, inK * visK * smoothstep(${a}, ${b}, u${p}Mix));`]);
export default {
  wlod: { water: lod },
  wlodR: { water: [...lod, ...raised] },
  wlodRc: { water: [...lod, ...raised, ...cov("0.0", "0.003")] },
};
