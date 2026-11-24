// Ice batch 37: the additive sky glow (cyan albedo * irr * 0.5, round 6's "bluer AND more luminous") is a uniform veil
// over every face: the milky, low-contrast read (band centre sd 10-13 vs the reference's 19). On top of icevar36 L5.
import V from "./icevar36.mjs";
const L5 = V.L5;
const GLOW = "vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.5;";
const TINT = "vec3 tint = mix(vec3(1.0), tcI, 0.7) * T;";
export default {
  L5: L5,
  g025: { frag: [...L5.frag, [GLOW, "vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.25;"]], vert: L5.vert, uniforms: L5.uniforms },
  g0: { frag: [...L5.frag, [GLOW, "vec3 body = mix(trans, scatterLight, s);"]], vert: L5.vert, uniforms: L5.uniforms },
  g0t: { frag: [...L5.frag, [GLOW, "vec3 body = mix(trans, scatterLight, s);"], [TINT, "vec3 tint = mix(vec3(1.0), tcI, 0.9) * T;"]], vert: L5.vert, uniforms: L5.uniforms },
};
