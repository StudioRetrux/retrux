// Round-10 grade (measured): (a) the far-left ridge at q00 x10-90 y300-340 is 39,70,117 vs F000 35,56,89 (B +28, chroma
// +33 %): on the ridge mask, 35 % less chroma and a cooler-to-slate trim; no local contrast (envvar36's drew a dark skyline
// outline). (b) The hold massif at p06 x100-300 y360-450 is 172,183,200 vs F420 154,169,193 (chroma -30 %): the hold's slate
// term reached only above 12-16 m; from 5-9 m, x0.86 with x1.25 chroma.
const AT = "  // Less of it in the hold: F420's massif is a crisp blue-grey face";
const RIDGE = `  if (ridgeBody > 0.0) {
    // Slate, not electric navy (QC round 10).
    float lrd = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, mix(vec3(lrd), col, 0.65) * vec3(0.8, 0.86, 0.9), ridgeBody);
  }
${AT}`;
const UPK = "    float upK = uHold * smoothstep(100.0, 130.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * smoothstep(12.0, 16.0, fp.y) * uPlateDepthOn;\n    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.15) * 0.9, upK);";
const UPK_N = "    float upK = uHold * smoothstep(100.0, 130.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * smoothstep(5.0, 9.0, fp.y) * uPlateDepthOn;\n    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.25) * 0.86, upK);";
export default {
  ridge: { plate: [[AT, RIDGE]] },
  massif: { plate: [[UPK, UPK_N]] },
  both: { plate: [[AT, RIDGE], [UPK, UPK_N]] },
};
