// Round-8 T02 follow-up: the boxy pale halo around a small rock at the pop camera went away with the raised fill blurred
// +2 mips instead of +5 (lakevar2 fL2; the filtered mirror length alone did not change it). +5 was there to hide the
// per-row source jumps of the fill (stripes, QC round 5): check the near lake in every hold / pop / release spot.
export default {
  r2: { water: [["  float lod = lodX + 5.0 * raised;", "  float lod = lodX + 2.0 * raised;"]] },
  r3: { water: [["  float lod = lodX + 5.0 * raised;", "  float lod = lodX + 3.0 * raised;"]] },
};
