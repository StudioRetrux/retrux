// Glitch batch 4: the lake's extra-projector samples took the rest projector's "raised" blur (+5 mips wherever the rest
// lookup landed on a floe / rock top), so clean extra-projector water turned into pale smooth slabs with the rest mask's
// stair-stepped outline (release / orbit). wlod: extra projectors sample at the DOF lod only. wcov as batch 3.
export const reset = "h.rig.holdOrbitEnd = 0.35;";
const P = ["Hold", "OrbN", "OrbP", "Tilt"];
const cov = P.map((p) => [`extraCover += u${p}Mix * inK * visK;`, `extraCover = max(extraCover, inK * visK * smoothstep(0.0005, 0.01, u${p}Mix));`]);
const lod = [
  ["float lod = uDofBlur * smoothstep(0.0, 30.0, abs(dist - uFocusDist)) + 5.0 * raised;", "float lodX = uDofBlur * smoothstep(0.0, 30.0, abs(dist - uFocusDist));\n  float lod = lodX + 5.0 * raised;"],
  ...P.map((p) => [`acc += textureLod(u${p}Plate, kq, lod)`, `acc += textureLod(u${p}Plate, kq, lodX)`]),
];
export default {
  wlod: { water: lod },
  wlodcov: { water: [...lod, ...cov] },
};
