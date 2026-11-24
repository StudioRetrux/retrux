// per-box MC32 / J48 / J32 change vs base for each variant in a crawl.mjs --out json: node tab.mjs FILE.json [thr]
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).summary;
const thr = +(process.argv[3] || 50);
const names = Object.keys(d).filter((n) => n !== "base");
const pct = (x, y) => (x ? (100 * (y - x)) / x : NaN);
console.log("box  base MC32 | " + names.map((n) => (n + " MC32%").padStart(13)).join("") + " | " + names.map((n) => (n + " J48%").padStart(12)).join("") + " | " + names.map((n) => ("eg " + n).padStart(10)).join(""));
for (const box of ["FS", "WR", "DR", "FF", "FR", "RS", "tot"]) {
  const g = (n) => (box === "tot" ? d[n].tot : d[n].box[box]);
  const B = g("base");
  let s = box.padEnd(4) + B.mc32.toFixed(2).padStart(10) + " | ";
  s += names.map((n) => { const v = pct(B.mc32, g(n).mc32); return ((v.toFixed(0) + "%" + (n === "gt" ? " " : v <= -thr ? " " : "*")).padStart(13)); }).join("");
  s += " | " + names.map((n) => (pct(B.j48, g(n).j48).toFixed(0) + "%").padStart(12)).join("");
  s += " | " + names.map((n) => (g(n).eg !== undefined ? g(n).eg.toFixed(3) : "-").padStart(10)).join("");
  console.log(s);
}
