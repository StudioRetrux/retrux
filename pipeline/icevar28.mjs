// Ice batch 28: band A needs ~+(0.065, 0.09, 0.15) linear over t70g12 to reach the reference (185,204,228): blue light
// ADDED inside the clear ice (iceColor^2 * ~0.15), not red removed. Stronger glow, without the (1 - frost) gate.
import B from "./icevar27.mjs";
const BODY = "vec3 body = mix(trans, scatterLight, s);";
const base = B.t70.frag;   // tint 0.7
const SCAT = "vec3 scatterLight = uFrostTint * mix(vec3(1.0), uIceColor, 0.55) * (irr * 0.72 + uSunColor * (0.06 * wrap + 0.18 * back));";
const blueScat = [SCAT, "vec3 scatterLight = uFrostTint * mix(vec3(1.0), uIceColor * uIceColor, 0.9) * (irr * 0.72 + uSunColor * (0.06 * wrap + 0.18 * back));"];
const glow = (g) => [BODY, `vec3 body = mix(trans, scatterLight, s) + uIceColor * uIceColor * irr * ${g.toFixed(3)};`];
export default {
  g20: { frag: [...base, blueScat, glow(0.2)] },
  g30: { frag: [...base, blueScat, glow(0.3)] },
  g40: { frag: [...base, blueScat, glow(0.4)] },
};
