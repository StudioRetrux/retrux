// T04 + T05 revised after qc\t0405 (vs F000 / F420): r31's ridge aerial (1 - 0.5 ridgeBody) hazed the ridge crest at rest
// (L117 vs F000's 95; the build 102), and h5 left the ridge too dark in the hold (L89 vs F420's 101, the build 123).
// h5b: the ridge keeps its old aerial gate (1 - 0.9 ridgeBody) at rest; the soft foot ramp + steel-blue foot tint (the
//      "lid" fix) stay; the hold bank keeps a little more of the ridge (exclusion 0.75 -> 0.45); everything else as h5.
import base from "./envvar32.mjs";
const swap = (list, find, repl) => list.map(([a, b]) => [a, b.split(find).join(repl)]);
let plate = base.h5.plate;
// T04's aerial (r31) -> the old gate at rest, the h5 hold factor kept.
plate = swap(plate, "* (1.0 - 0.6 * uHold) * (1.0 - ridgeBody * mix(0.5, 0.75, uHold)));", "* (1.0 - 0.6 * uHold) * (1.0 - ridgeBody * 0.9));");
plate = swap(plate, "* (1.0 - 0.85 * uHold) * (1.0 - ridgeBody * mix(0.5, 0.75, uHold)));", "* (1.0 - 0.85 * uHold) * (1.0 - ridgeBody * 0.9));");
plate = plate.map(([a, b]) => [a.split("(1.0 - ridgeBody * mix(0.5, 0.75, uHold)));").join("(1.0 - ridgeBody * 0.9));"), b]);
// Bank exclusion on the ridge 0.75 -> 0.45 (both the T04 line and h5's rewrite of it).
plate = swap(plate, "(1.0 - 0.75 * ridgeBody * smoothstep(1.0, 6.0, fp.y))", "(1.0 - 0.45 * ridgeBody * smoothstep(1.0, 6.0, fp.y))");
// ...and h5's find string for that line, which is T04's output.
plate = plate.map(([a, b]) => [a.split("(1.0 - 0.75 * ridgeBody * smoothstep(1.0, 6.0, fp.y))").join("(1.0 - 0.45 * ridgeBody * smoothstep(1.0, 6.0, fp.y))"), b]);
export default {
  h5b: { plate, water: base.h5.water },
};
