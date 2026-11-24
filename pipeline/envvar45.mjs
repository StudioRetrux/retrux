// Round-10 hold, continued (envvar44 b3: upper L163 / mid 136 / bank 152 / low 171 vs F420 153 / 117 / 162 / 162).
//  b4: the face term x0.6 with x1.4 chroma; the bank denser at the massif's foot (opacity cap 0.8 -> 0.88, x1.0 instead of
//      x0.85) and x1.08 (instead of x1.12, the low band was already +9).
//  b5: b4's bank, the face as a local "dehaze" instead: the face's 2.5-mip mean x0.68 plus its local detail x1.6, chroma x1.3
//      (the hold plate's baked volumetric mist flattened the rock ribs; a plain multiply kept them flat).
import base from "./envvar44.mjs";
const B1 = base.b1.plate;
const UPK2 = "    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.3) * 0.85, upK);";
const UPK4 = "    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.4) * 0.6, upK);";
const UPK5 = `    if (upK > 0.0) {
      vec3 fm = plateGrade(samplePlate(uv, lod + 2.5));
      vec3 dh = max(fm * 0.68 + (col - fm) * 1.6, vec3(0.0));
      float ld = dot(dh, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, vec3(ld) + (dh - vec3(ld)) * 1.3, upK);
    }`;
const BK = "    col = mix(col, bankC, min(bk * 0.85, 0.8));";
const BK_N = "    col = mix(col, bankC * 1.08, min(bk, 0.88));";
export default {
  b4: { plate: [...B1, [UPK2, UPK4], [BK, BK_N]] },
  b5: { plate: [...B1, [UPK2, UPK5], [BK, BK_N]] },
};
