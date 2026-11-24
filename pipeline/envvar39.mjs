// Rounds 9-10 (grade, cursor hunter): crushed blacks. The bottom rocks' 0.1 % luma 24 vs F000's 37, and a pure-black slit in
// the right floe's shadowed overhang (ptr_right x~1087-1137 y~655-660), which the near lift (< 12-22 m) does not reach.
// toe1: a toe on the plate's darkest values at any distance (linear luma < 0.03 on a 0.75 power, 25 % less chroma there).
const AT = "  // The far-left ridge reads as a dark navy, shadowed mountain in the reference";
const toe = (lim, p) => `  {
    // Crushed-black toe (QC rounds 9-10).
    float lz = dot(col, vec3(0.2126, 0.7152, 0.0722));
    if (lz < ${lim}) {
      float lzt = ${lim} * pow(max(lz, 0.0) / ${lim}, ${p});
      col = mix(vec3(lzt), col * (lzt / max(lz, 1e-5)), 0.75);
    }
  }
${AT}`;
export default {
  toe1: { plate: [[AT, toe("0.03", "0.75")]] },
  toe2: { plate: [[AT, toe("0.045", "0.7")]] },
};
