// Debug the specks c3 still leaves: r = hidden from the rest projector (fz0 > oz0 x1.02 + 0.5), g = crackK,
// b = the extra projectors' share of the final colour. (Build = c3.)
import base from "./envvar50.mjs";
const C3 = base.c3.plate;
const BL = "    col = acc / wsum;\n  }\n#endif";
const BL_N = "    col = acc / wsum;\n    extraW = (wsum - w0) / wsum;\n  }\n#endif";
const PRE = "  float crackK = 0.0;\n  if (uPlateDepthOn > 0.5) {\n    float oz0 = ";
const PRE_N = "  float crackK = 0.0;\n  float extraW = 0.0;\n  float hidK = 0.0;\n  if (uPlateDepthOn > 0.5) {\n    float oz0 = ";
const HID = "    if (oz0 > 40.0 && oz0 < 300.0 && fz0 > oz0 * 1.02 + 0.5) {\n      float ez";
const HID_N = "    hidK = step(oz0 * 1.02 + 0.5, fz0);\n    if (oz0 > 40.0 && oz0 < 300.0 && fz0 > oz0 * 1.02 + 0.5) {\n      float ez";
const END = "  gl_FragColor = vec4(mix(col, mix(MIST_COLOR * vec3(0.81, 0.9, 1.0), footC, ridgeFoot), min(mist, 0.85)), 1.0);";
export default {
  dd: { plate: [...C3, [PRE, PRE_N], [HID, HID_N], [BL, BL_N], [END, `${END}\n  gl_FragColor = vec4(hidK, crackK, extraW, 1.0);`]] },
};
