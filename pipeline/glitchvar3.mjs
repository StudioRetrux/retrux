// Glitch batch 3: lake smears in release / orbit. wdbg = (plateW, extraCover, occl|nofill). wcov = an extra projector that
// sees the lake point counts as full cover once it holds >= ~1 % of the proximity share (extraCover summed the shares, so
// a far projector that alone saw the water behind a rock still handed it to the flat live mirror: pale slabs).
export const reset = "h.rig.holdOrbitEnd = 0.35;";
const P = ["Hold", "OrbN", "OrbP", "Tilt"];
const cov = P.map((p) => [`extraCover += u${p}Mix * inK * visK;`, `extraCover = max(extraCover, inK * visK * smoothstep(0.0005, 0.01, u${p}Mix));`]);
export default {
  wdbg: { water: [["gl_FragColor = vec4(col, 1.0);\n}", "gl_FragColor = vec4(plateW, extraCover, max(occl, nofill), 1.0);\n}"]] },
  wcov: { water: cov },
  wcovdbg: { water: [...cov, ["gl_FragColor = vec4(col, 1.0);\n}", "gl_FragColor = vec4(plateW, extraCover, max(occl, nofill), 1.0);\n}"]] },
};
