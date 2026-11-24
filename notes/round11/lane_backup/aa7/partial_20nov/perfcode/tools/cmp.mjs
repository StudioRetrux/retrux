// cmp.mjs A.json B.json [label]: final image / all targets / all linked programs, ident-style
import fs from "node:fs";
const [a, b, lab] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync(a)), B = JSON.parse(fs.readFileSync(b));
const ks = new Set([...Object.keys(A.programs || {}), ...Object.keys(B.programs || {})]);
const pd = [...ks].filter((k) => JSON.stringify(A.programs[k]) !== JSON.stringify(B.programs[k]));
const tk = new Set([...Object.keys(A.targets || {}), ...Object.keys(B.targets || {})]);
const td = [...tk].filter((k) => JSON.stringify(A.targets[k]) !== JSON.stringify((B.targets || {})[k]));
const same = !pd.length && !td.length;
console.log(`${(lab || a.split("/").pop() + " vs " + b.split("/").pop()).padEnd(46)} ${same ? "IDENTICAL" : "DIFFER   "} final ${A.targets?.final?.hash === B.targets?.final?.hash ? "SAME" : "DIFF"} | targets ${tk.size} (${[...tk].join(",")}) differ: ${td.join(",") || "-"} | programs ${ks.size} differ: ${pd.join(",") || "-"} | logs ${(A.logs || []).filter((l) => !l.startsWith("pre=")).length}/${(B.logs || []).filter((l) => !l.startsWith("pre=")).length}`);
