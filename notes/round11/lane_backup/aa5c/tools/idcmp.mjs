// compare two ident2 outputs: per-frame equal counts for mirror / walk / final, and program sets
import fs from "node:fs";
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f)));
const cmp = (k) => { const A = a.per?.[k] || [], B = b.per?.[k] || []; let eq = 0; const bad = []; for (let i = 0; i < Math.max(A.length, B.length); i++) { if (A[i] === B[i]) eq++; else bad.push(i); } return `${k} ${eq}/${Math.max(A.length, B.length)} equal${bad.length ? " (first diff frames " + bad.slice(0, 8).join(",") + ")" : ""}`; };
const ks = new Set([...Object.keys(a.programs || {}), ...Object.keys(b.programs || {})]);
const pd = [...ks].filter((k) => JSON.stringify(a.programs[k]) !== JSON.stringify(b.programs[k]));
console.log(`${process.argv[2].split("/").pop()} vs ${process.argv[3].split("/").pop()}: ${cmp("mirror")} | ${cmp("walk")} | ${cmp("final")} | programs ${ks.size}, differ: ${pd.join(", ") || "-"} | logs ${(a.logs || []).length} ${(b.logs || []).length}`);
