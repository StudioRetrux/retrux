// T06: the dark band 5-6 px outside the mid-left mound's edge (left orbit, time-dependent) is LAKE whose lookup lands
// on the mound's texels. Is it the ripple-bent lookup (offs)? noRipX: the extra projectors' lake lookup without the
// ripple offset. noRipAll: the rest projector's too. hq1: keep the offset but reject a bent lookup that lands on a
// RAISED surface (rebuild the point the projector saw at kq from its depth; above the water = not lake), the same test
// the straight lookup uses, instead of the 0.92 d - 0.3 m depth rule (which a lake point just behind a near object
// passes: mound 13.5 m vs lake 14 m).
const KEYS = [["Hold", "hold"], ["OrbN", "orbN"], ["OrbP", "orbP"], ["Tilt", "tilt"]];
// (One pair: the line is identical in every projector block and the probe's split / join replaces all of them.)
const noRipX = [["        vec2 kq = clamp(k + offs, vec2(0.0005), vec2(0.9995));", "        vec2 kq = clamp(k, vec2(0.0005), vec2(0.9995));"]];
// Projector frustum terms (same for every plate: makePerspective with the plate overscan): ndc -> view ray.
const P00 = "1.805686", P11 = "3.317933", P21 = "0.052632";
const hq = KEYS.map(([P, p]) => [
  `kq = mix(kq, kc, step(${p}DepthAt(kq), ${p}DepthAt(kc) * 0.92 - 0.3));`,
  `{
          // The point this projector saw at kq, rebuilt from its depth: a bent lookup must land on the lake.
          float qd = ${p}DepthAt(kq);
          vec2 qn = kq * 2.0 - 1.0;
          vec3 qv = vec3(qn.x / ${P00}, (qn.y + ${P21}) / ${P11}, -1.0) * qd;
          mat3 qR = mat3(u${P}View);
          vec3 qw = transpose(qR) * (qv - u${P}View[3].xyz);
          float bad = step(0.05, qw.y - vWorldPos.y) + step(${p}DepthAt(kq), ${p}DepthAt(kc) * 0.92 - 0.3);
          kq = mix(kq, kc, min(bad, 1.0));
        }`,
]);
export default {
  noRipX: { water: noRipX },
  noRipAll: { water: [...noRipX, ["  vec2 quv = clamp(puv + offs, vec2(0.0005), vec2(0.9995));", "  vec2 quv = clamp(puv, vec2(0.0005), vec2(0.9995));"]] },
  hq1: { water: hq },
};
