// Round-9 plan T10: the end caps (tirZone ~1, t at its 1.6 m clamp) are flat saturated cobalt: T = exp(-uAbsorb t - (1.2,
// 0.55, 0.15) max(t - 0.5, 0)) ~ (0.15, 0.42, 0.80), plus pathK's 0.45 navy, the blue body glow, and a weak tirZone scatter.
// Target (q00 cap x885-905 y345-400): ~151,177,212, sd >= 12, B-R ~61; the steel TIR bar must stay.
// e63: (1) the long-path term on tAbs = min(t, 0.9) with (0.55, 0.32, 0.14); (2) end blocks desaturated / lifted
// (mix(luma, body, 0.6) x 1.12 at 0.6 tirZone); (3) pathK navy 0.45 -> 0.3; (4) +-8 % frost-noise luma in the end blocks.
const T_ = "  vec3 T = exp(-uAbsorb * t - vec3(1.2, 0.55, 0.15) * max(t - 0.5, 0.0));";
const T_N = "  float tAbs = min(t, 0.9);\n  vec3 T = exp(-uAbsorb * t - vec3(0.55, 0.32, 0.14) * max(tAbs - 0.5, 0.0));";
const PATH = "  body = mix(body, vec3(0.066, 0.162, 0.392) * (0.6 + 0.4 * irr.b), pathK * 0.45);";
const PATH_N = "  body = mix(body, vec3(0.066, 0.162, 0.392) * (0.6 + 0.4 * irr.b), pathK * 0.3);";
const TZ = "  body = mix(body, scatterLight * 1.1 + vec3(0.456, 0.578, 0.776) * irr * 0.3, tirZone * 0.3);";
const TZ_N = `  body = mix(body, scatterLight * 1.1 + vec3(0.456, 0.578, 0.776) * irr * 0.3, tirZone * 0.3);
  {
    // End blocks (QC round 9, T10): frosted and broken up, not flat saturated cobalt.
    float lb = dot(body, vec3(0.2126, 0.7152, 0.0722));
    body = mix(body, mix(vec3(lb), body, 0.6) * 1.12, 0.6 * tirZone);
    body *= 1.0 + (nA - 0.5) * 0.16 * tirZone;
  }`;
const tzLift = (k, w) => TZ_N.replace("mix(vec3(lb), body, 0.6) * 1.12, 0.6 * tirZone", `mix(vec3(lb), body, 0.6) * ${k}, ${w} * tirZone`);
export default {
  e63: { frag: [[T_, T_N], [PATH, PATH_N], [TZ, TZ_N]] },
  e63b: { frag: [[T_, T_N], [PATH, PATH_N], [TZ, tzLift("1.3", "0.75")]] },
  e63c: { frag: [[T_, T_N], [PATH, PATH_N], [TZ, tzLift("1.45", "0.85")]] },
};
