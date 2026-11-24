// Round-9 env + grade: the far-left ridge reads as a flat, uniform, over-saturated "electric navy" block (sat 0.78 vs 0.67;
// no rock / snow detail). The shadow blue shift (plateGrade) and envChroma push its dark rock to saturated navy, and the
// far band's local contrast excludes the ridge. rdA: on the ridge only, local contrast +0.5 against a 2.5-mip blur and 20 %
// less chroma. rdB: +0.8 and 25 %.
const AT = "  // Less of it in the hold: F420's massif is a crisp blue-grey face";
const rd = (k, d) => `  if (ridgeBody > 0.0) {
    // The ridge's rock detail back, and less of the grade's electric navy (QC round 9).
    vec3 rbl = plateGrade(samplePlate(uv, lod + 2.5));
    col = max(col + (col - rbl) * ${k} * ridgeBody, vec3(0.0));
    float lr = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, mix(vec3(lr), col, ${d}), ridgeBody);
  }
${AT}`;
export default {
  rdA: { plate: [[AT, rd("0.5", "0.8")]] },
  rdB: { plate: [[AT, rd("0.8", "0.75")]] },
};
