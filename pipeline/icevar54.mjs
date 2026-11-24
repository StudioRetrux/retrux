// Round-9 ice judge: "flat, saturated blue rectangular end-caps on the belt (ring D) and tube ends" (q00 x885-905 y345-400:
// rgb 109,150,195, L144, sd 6.4, B-R 87; F000: 151,177,212, L174, sd 13.9, B-R 61). The long-path term REPLACES the body
// with one flat navy (0.066, 0.162, 0.392) where the view runs along the slab (pathK), a uniform saturated panel.
// e54a: a multiplicative darkening instead (keeps the refracted / frost structure), less saturated.
// e54b: e54a, lighter (the reference cap is L174).
const PATH = "  body = mix(body, vec3(0.066, 0.162, 0.392) * (0.6 + 0.4 * irr.b), pathK * 0.45);";
export default {
  e54a: { frag: [[PATH, "  body = mix(body, body * vec3(0.62, 0.76, 0.98), pathK * 0.7);"]] },
  e54b: { frag: [[PATH, "  body = mix(body, body * vec3(0.7, 0.82, 1.0), pathK * 0.6);"]] },
};
