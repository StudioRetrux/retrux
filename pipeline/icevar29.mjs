// Ice batch 29 (round 6): on g40, the reference's crisp dark steel-blue bars where a slab's front face turns into its
// sides (F000 band A ends x585-593: 125,155,193; dark lines along its top / bottom edges), where this morning's change
// put WHITE frost on the chamfers. No frost floor at the chamfers; a thin dark steel-blue line in the corner zone.
import B from "./icevar28.mjs";
const FROST = "frost = max(frost * mix(0.82, 1.0, frostE), 0.35 * frostE);";
const EDGE = "body += scatterLight * edgeMask * (0.008 + 0.012 * cellRand);";
const line = (lo, hi, k) => [EDGE, `${EDGE}
  // Total internal reflection at the slab's corners: thin dark steel-blue lines (F000's band ends and edges).
  float tirLine = smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, min(abs(vSec.x), abs(vSec.y)));
  body = mix(body, vec3(0.2, 0.33, 0.54) * (0.55 + 0.45 * irr.b), tirLine * ${k.toFixed(2)});`];
export default {
  g40: B.g40,
  noFrostE: { frag: [...B.g40.frag, [FROST, "frost = frost * mix(0.82, 1.0, frostE);"]] },
  line1: { frag: [...B.g40.frag, [FROST, "frost = frost * mix(0.82, 1.0, frostE);"], line(0.72, 0.9, 0.65)] },
  line2: { frag: [...B.g40.frag, [FROST, "frost = frost * mix(0.82, 1.0, frostE);"], line(0.8, 0.94, 0.8)] },
};
