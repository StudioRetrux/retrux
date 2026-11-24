// identcmpV A.json B.json label: identcmp + the per-10-frame final hashes + target read errors + console line counts
import fs from "node:fs";
const [a, b, lab] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync(a)), B = JSON.parse(fs.readFileSync(b));
const ks = new Set([...Object.keys(A.programs || {}), ...Object.keys(B.programs || {})]);
const pd = [...ks].filter((k) => JSON.stringify(A.programs[k]) !== JSON.stringify(B.programs[k]));
const tk = new Set([...Object.keys(A.targets || {}), ...Object.keys(B.targets || {})]);
const td = [...tk].filter((k) => JSON.stringify(A.targets[k]) !== JSON.stringify((B.targets || {})[k]));
const errs = [...tk].filter((k) => (A.targets[k] || {}).err || ((B.targets || {})[k] || {}).err);
const mid = JSON.stringify(A.mid) === JSON.stringify(B.mid);
const same = !pd.length && !td.length && mid && A.targets && B.targets;
console.log(`${(lab || "").padEnd(34)} ${same ? "IDENTICAL" : "DIFFER   "} final ${A.targets?.final?.hash === B.targets?.final?.hash ? "SAME" : "DIFF"} mid(${(A.mid||[]).length}) ${mid ? "SAME" : "DIFF"} | targets ${tk.size} differ: ${td.join(",") || "-"} | readErr: ${errs.join(",") || "-"} | programs ${ks.size} differ: ${pd.join(",") || "-"} | console lines ${(A.logs || []).length}/${(B.logs || []).length}`);
