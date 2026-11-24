// Pop-frame floe hairlines (lake, extra-projector lookups): is it the ripple-bent lookup landing on the floe's dark waterline
// (< 5 cm above the water, so the SeenY test passes it)? noRipX: the extra projectors' lake lookup unbent. seen01: the SeenY
// threshold 5 cm -> 1 cm (every projector). noReaimX: the extras' straight lookup (no mirror re-aim), for comparison.
const KEYS = ["hold", "orbN", "orbP", "tilt"];
const KQ = "        vec2 kq = clamp(k + offs, vec2(0.0005), vec2(0.9995));";
export default {
  noRipX: { water: [[KQ, "        vec2 kq = clamp(k, vec2(0.0005), vec2(0.9995));"]] },
  seen01: {
    water: [
      ...KEYS.map((p) => [`max(step(0.05, ${p}SeenY(kq) - vWorldPos.y)`, `max(step(0.01, ${p}SeenY(kq) - vWorldPos.y)`]),
      ["max(step(0.05, plateSeenY(quv) - vWorldPos.y)", "max(step(0.01, plateSeenY(quv) - vWorldPos.y)"],
    ],
  },
};
