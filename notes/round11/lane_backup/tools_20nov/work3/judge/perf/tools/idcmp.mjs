import fs from "node:fs";
const dir = process.argv[2];
const L = (n) => JSON.parse(fs.readFileSync(`${dir}/${n}.json`, "utf8"));
const cmp = (a, b) => {
  let A, B;
  try { A = L(a); B = L(b); } catch (e) { console.log(`${a} vs ${b}: missing`); return; }
  const n = Math.min(A.hashes?.length ?? 0, B.hashes?.length ?? 0);
  let same = 0, firstDiff = -1;
  for (let i = 0; i < n; i++) { if (A.hashes[i] === B.hashes[i]) same++; else if (firstDiff < 0) firstDiff = i; }
  const ks = new Set([...Object.keys(A.programs || {}), ...Object.keys(B.programs || {})]);
  const pd = [...ks].filter((k) => JSON.stringify(A.programs[k]) !== JSON.stringify(B.programs[k]));
  const tk = new Set([...Object.keys(A.targets || {}), ...Object.keys(B.targets || {})]);
  const td = [...tk].filter((k) => JSON.stringify(A.targets[k]) !== JSON.stringify(B.targets[k]));
  console.log(`${(a + " vs " + b).padEnd(34)} frames ${same}/${n} identical${firstDiff >= 0 ? " (first diff k" + firstDiff + ")" : ""} | targets differ: ${td.join(",") || "-"} | programs ${ks.size}, differ: ${pd.join(",") || "-"} | taaOn ${A.taaOn}/${B.taaOn} mirrorEvery ${A.mirrorEvery}/${B.mirrorEvery} | tier ${A.tier}/${B.tier} main ${A.main}/${B.main} | logs ${A.logs?.length}/${B.logs?.length}`);
};
for (const [a, b] of process.argv.slice(3).map((s) => s.split(":"))) cmp(a, b);
