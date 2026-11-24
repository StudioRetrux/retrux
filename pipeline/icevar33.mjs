// Ice batch 33: debug of the analytic TIR bar (icevar32 T11). dbg1 = (tirBar, lenD, inward-heading); dbg2 = (dmin / rIn
// mapped 0.5..1.5 -> 0..1, uSectionRadius / 2, uSectionHalf.x * 4); dbg3 = (|p2| / R mapped 0.5..1.5, vSec.x, 0).
import V from "./icevar32.mjs";
const OUT = "gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);";
const base = V.b1.frag;
export default {
  dbg1: { frag: [...base, [OUT, "gl_FragColor = vec4(tirBar, lenDb, step(dot(p2b, d2b), 0.0), 1.0);"]], uniforms: V.b1.uniforms },
  dbg2: { frag: [...base, [OUT, "gl_FragColor = vec4(saturate(dminB / max(rInB, 1e-4) - 0.5), uSectionRadius * 0.5, uSectionHalf.x * 4.0, 1.0);"]], uniforms: V.b1.uniforms },
  dbg3: { frag: [...base, [OUT, "gl_FragColor = vec4(saturate(length(p2b) / max(uSectionRadius, 1e-4) - 0.5), vSec.x * 0.5 + 0.5, 0.0, 1.0);"]], uniforms: V.b1.uniforms },
};
