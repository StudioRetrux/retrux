// Round-10 hold: F420 = a dark slate massif over a lighter fog bank (upper face L153, mid face L117, bank L162); p06 had
// upper 173 / mid 153 / bank 152: no separation (the bank's 5-13 m transition covered the mid face, so the face's slate
// term could not show either). Base = envvar43 "all" (ridge slate, pz-gated upK, haze 0.17, steel mist x0.7), plus:
//  b1: the bank's top at 7 +- 3 m with a 5 m edge (was 11 +- 4 m, 8 m edge);
//  b2: b1 + the face term (x1.35) x0.75;
//  b3: b2 + the bank x1.12 (lighter than the face, as F420).
import base from "./envvar43.mjs";
const BASE = base.all.plate;
const TOP = "  float top = 11.0 + 4.0 * fbm(vec3(p.xz * 0.015 + vec2(time * 0.02, 0.0), 1.7), 2);\n  float hgt = 1.0 - smoothstep(top - 6.0, top + 2.0, p.y);";
const TOP_N = "  float top = 7.0 + 3.0 * fbm(vec3(p.xz * 0.015 + vec2(time * 0.02, 0.0), 1.7), 2);\n  float hgt = 1.0 - smoothstep(top - 3.5, top + 1.5, p.y);";
const UPK2 = "    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.3) * 0.85, upK);";
const UPK2_N = "    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.35) * 0.75, upK);";
const BC = "    vec3 bankC = mix(uFogColor * vec3(0.30, 0.37, 0.46), uFogColor * vec3(0.44, 0.54, 0.66), plateBankBillow);";
const BC_N = "    vec3 bankC = mix(uFogColor * vec3(0.30, 0.37, 0.46), uFogColor * vec3(0.44, 0.54, 0.66), plateBankBillow) * 1.12;";
export const reset = "";
export default {
  base: { plate: BASE },
  b1: { plate: [...BASE, [TOP, TOP_N]] },
  b2: { plate: [...BASE, [TOP, TOP_N], [UPK2, UPK2_N]] },
  b3: { plate: [...BASE, [TOP, TOP_N], [UPK2, UPK2_N], [BC, BC_N]] },
};
