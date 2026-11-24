// Ice batch 31 (round 6 plan T08, cumulative): bluer AND more luminous, not whiter.
// c1 luminance-preserving interface tint; c2 + weaker absorption; c3 + cyan in-scatter albedo (#B4C8E4) and a cooler
// frost tint; c4 + less, bluer reflection; c5 + steel-blue refracted dark bands.
const TINT = "vec3 tint = mix(vec3(1.0), pow(uIceColor, vec3(1.5)), 0.7) * T;";
const TINT2 = `vec3 tcI = pow(uIceColor, vec3(1.5));
  tcI /= mix(1.0, dot(tcI, vec3(0.2126, 0.7152, 0.0722)), 0.65);
  vec3 tint = mix(vec3(1.0), tcI, 0.7) * T;`;
const SCAT = "uIceColor * uIceColor * irr * 0.4;";
const SCAT2 = "vec3(0.456, 0.578, 0.776) * irr * 0.5;";
const COL = "vec3 col = body * (1.0 - F * 0.7) + refl * F * 0.7 + spec * 0.7;";
const COL2 = `refl = mix(refl, refl * vec3(0.88, 0.96, 1.1), 0.6);
  vec3 col = body * (1.0 - F * 0.5) + refl * F * 0.5 + spec * 0.7;`;
const GATE = "trans = mix(trans, vec3(tl) * vec3(0.86, 0.95, 1.08), smoothstep(0.2, 0.55, chroma));";
const GATE2 = `${GATE}
  trans = mix(trans, trans * vec3(0.84, 0.95, 1.14), (1.0 - smoothstep(0.25, 0.7, tl)) * 0.7);`;
const c1 = [[TINT, TINT2]];
const c3f = [...c1, [SCAT, SCAT2]];
const c4f = [...c3f, [COL, COL2]];
const c5f = [...c4f, [GATE, GATE2]];
const U2 = { uAbsorb: [0.36, 0.17, 0.04] };
const U3 = { ...U2, uFrostTint: [0.78, 0.88, 1.0] };
export default {
  c1: { frag: c1 },
  c2: { frag: c1, uniforms: U2 },
  c3: { frag: c3f, uniforms: U3 },
  c4: { frag: c4f, uniforms: U3 },
  c5: { frag: c5f, uniforms: U3 },
};
