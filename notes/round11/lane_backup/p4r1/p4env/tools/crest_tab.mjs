// p4env G1: the far-only crest + per-column skyline depth from crest_ray2.json.
import fs from "node:fs";
const r = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const NEAR_DEPTH = 118; // RANGE_DEPTH: objects nearer than this hide the card by real depth
const cols = r.cols;
// calibration: table crest minus the geometric far skyline where the skyline object IS the far range
const offs = cols.filter((c) => c.all && c.far && c.all.who === c.far.who && c.all.dz > NEAR_DEPTH && c.under).map((c) => c.crest - c.far.v);
offs.sort((a, b) => a - b);
const med = offs[Math.floor(offs.length / 2)];
console.log("offset n", offs.length, "median", med.toFixed(5), "p25", offs[Math.floor(offs.length * 0.25)].toFixed(5), "p75", offs[Math.floor(offs.length * 0.75)].toFixed(5));
const crest = [], depth = [], label = [];
for (const c of cols) {
  const near = c.all && c.all.dz < NEAR_DEPTH && c.col >= 129; // the geometric skyline is a near object (iceberg / mound / shore plain)
  if (near) {
    const v = Math.min(c.far.v + med, c.crest - 0.0015);
    crest.push(+v.toFixed(4));
    depth.push(Math.round(c.far.dz));
    label.push(`${c.col}:${c.all.who}->${c.far.who}`);
  } else if (c.col < 129) {
    // no geometry at the table's crest (the plate's mist / hero region): keep the table and the old 250 m evaluation
    crest.push(c.crest);
    depth.push(250);
  } else {
    crest.push(c.crest);
    depth.push(Math.round(c.far.dz));
  }
}
console.log("near cols", label.join(" "));
console.log("CREST_FAR", JSON.stringify(crest));
console.log("DEPTH", JSON.stringify(depth));
fs.writeFileSync(process.argv[3], JSON.stringify({ med, crest, depth, label }, null, 1));
