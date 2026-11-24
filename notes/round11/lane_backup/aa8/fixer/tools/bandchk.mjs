// AA8 fixer (AJ-2 acceptance): where does the restored default frame still differ from the no-loss frame? Band = px the TAA path
// changes in the no-loss run (def_L0 != lktaa0_L0, same frame: the TAA + its knee), dilated by R px. Counts diff px (max channel)
// inside / outside the band at > 0 / > 2 / > 4 / > 16 levels, per frame; bbox of the outside px.
//   node bandchk.mjs CTXDIR PREFIX(fix|pre) R
import fs from "node:fs";
const [D, P, Rs] = process.argv.slice(2); const R = +Rs, W = 1440, H = 766;
for (const k of [0, 1, 2, 3]) {
  const r = (n) => fs.readFileSync(`${D}/${P}_${n}_f${k}.rgba`);
  const a1 = r("def_L1"), a0 = r("def_L0"), b0 = r("lktaa0_L0");
  const md = (A, B, i) => Math.max(Math.abs(A[i * 4] - B[i * 4]), Math.abs(A[i * 4 + 1] - B[i * 4 + 1]), Math.abs(A[i * 4 + 2] - B[i * 4 + 2]));
  const band0 = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) band0[i] = md(a0, b0, i) > 0 ? 1 : 0;
  const band = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!band0[y * W + x]) continue; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) band[yy * W + xx] = 1; } }
  const th = [0, 2, 4, 16]; const inB = th.map(() => 0), outB = th.map(() => 0); let bb = [W, H, -1, -1], omax = 0, bandN = 0;
  for (let i = 0; i < W * H; i++) { bandN += band[i]; const d = md(a1, a0, i); th.forEach((t, j) => { if (d > t) (band[i] ? inB : outB)[j]++; }); if (!band[i] && d > 0) { omax = Math.max(omax, d); const x = i % W, y = H - 1 - Math.floor(i / W); bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)]; } }
  console.log(JSON.stringify({ frame: k, bandPx: bandN, R, inBand: Object.fromEntries(th.map((t, j) => [">" + t, inB[j]])), outside: Object.fromEntries(th.map((t, j) => [">" + t, outB[j]])), outsideMax: omax, outsideBBox: bb[2] < 0 ? null : bb }));
}
