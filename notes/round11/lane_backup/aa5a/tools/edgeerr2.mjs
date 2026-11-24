// AA4Y: error vs the 16-sample GT on EDGE pixels only (3x3 holds lake AND solid, from the BASE mask session), per box.
//   node edgeerr.mjs --mask MASKDIR --gt GTDIR --seq NAME=DIR [...] [--k0 1] [--k1 N] [--stride 1] [--out f.json]
// Also: eg on lake / solid pixels 3-5 px from the boundary ("floor": texture / shading differences no AA can remove),
// and the edge error split by local contrast (max-min luma of the GT 3x3: <40, 40-100, >100 levels).
import fs from "node:fs";
import { loadSeq, bandFromMask, dilate } from "./lib.mjs";
const argv = process.argv.slice(2);
const seqs = [];
const BIN = process.argv.includes("--bin"); let maskDir, gtDir, k0 = 1, k1 = Infinity, stride = 1, outFile = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--mask") maskDir = argv[++i];
  else if (a === "--gt") gtDir = argv[++i];
  else if (a === "--seq") { const [n, d] = argv[++i].split("="); seqs.push({ name: n, s: loadSeq(d) }); }
  else if (a === "--k0") k0 = +argv[++i];
  else if (a === "--k1") k1 = +argv[++i];
  else if (a === "--stride") stride = +argv[++i];
  else if (a === "--out") outFile = argv[++i];
}
const M = loadSeq(maskDir), G = loadSeq(gtDir);
const W = M.W, H = M.H, Y0 = M.y0;
const sx = W / 1440;
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const boxes = Object.fromEntries(Object.entries(BOXES).map(([k, b]) => [k, [Math.round(b[0] * sx), Math.max(0, Math.round(b[1] * sx) - Y0), Math.round(b[2] * sx), Math.min(H, Math.round(b[3] * sx) - Y0)]]));
const names = Object.keys(boxes);
const boxOf = new Int8Array(W * H).fill(-1);
names.forEach((n, bi) => { const [x0, y0, x1, y1] = boxes[n]; for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = x0; x < x1; x++) if (boxOf[y * W + x] < 0) boxOf[y * W + x] = bi; });
const N = Math.min(M.n, G.n, ...seqs.map((q) => q.s.n), k1 + 1);
const acc = Object.fromEntries(seqs.map((q) => [q.name, { box: Object.fromEntries(names.map((n) => [n, { n: 0, e: 0, s: 0, fl: 0, fln: 0, fs: 0, fsn: 0 }])), con: [[0, 0], [0, 0], [0, 0]] }]));
for (let k = k0; k < N; k += stride) {
  const m = M.mask(k);
  const bm = bandFromMask(m, W, H, 3); const hero = bm.hero; const lake = bm.lake; const solid = BIN ? lake.map((v) => 1 - v) : bm.solid;
  // edge = 3x3 holds lake and solid
  const edge = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let l = 0, s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * W + x + dx; l |= lake[j]; s |= solid[j]; }
    const i = y * W + x;
    if (l && s && !hero[i]) edge[i] = 1;
  }
  // floor rings: 3..5 px from any edge pixel
  const d2 = dilate(edge, W, H, 2), d5 = dilate(edge, W, H, 5);
  const gt = G.frame(k);
  for (const q of seqs) {
    const F = q.s.frame(k), A = acc[q.name];
    for (let i = 0; i < W * H; i++) {
      const bi = boxOf[i];
      if (bi < 0 || hero[i]) continue;
      const p = i * 4;
      const e = Math.max(Math.abs(F[p] - gt[p]), Math.abs(F[p + 1] - gt[p + 1]), Math.abs(F[p + 2] - gt[p + 2]));
      const b = A.box[names[bi]];
      if (edge[i]) {
        b.n++; b.e += e;
        b.s += (F[p] + F[p + 1] + F[p + 2] - gt[p] - gt[p + 1] - gt[p + 2]) / 3;
        // contrast of the GT 3x3 (luma)
        const y = (i / W) | 0, x = i % W;
        let mn = 1e9, mx = -1e9;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = ((y + dy) * W + x + dx) * 4; const L = 0.2126 * gt[j] + 0.7152 * gt[j + 1] + 0.0722 * gt[j + 2]; if (L < mn) mn = L; if (L > mx) mx = L; }
        const c = mx - mn < 40 ? 0 : mx - mn < 100 ? 1 : 2;
        A.con[c][0]++; A.con[c][1] += e;
      } else if (d5[i] && !d2[i]) {
        if (lake[i]) { b.fl += e; b.fln++; } else if (solid[i]) { b.fs += e; b.fsn++; }
      }
    }
  }
}
const out = {};
for (const q of seqs) {
  const A = acc[q.name];
  const r = { box: {}, tot: null };
  let n = 0, e = 0, s = 0, fl = 0, fln = 0, fs = 0, fsn = 0;
  for (const nm of names) {
    const b = A.box[nm];
    r.box[nm] = { n: b.n, eg: +(b.e / Math.max(1, b.n)).toFixed(3), bias: +(b.s / Math.max(1, b.n)).toFixed(3), floorLake: +(b.fl / Math.max(1, b.fln)).toFixed(3), floorSolid: +(b.fs / Math.max(1, b.fsn)).toFixed(3) };
    n += b.n; e += b.e; s += b.s; fl += b.fl; fln += b.fln; fs += b.fs; fsn += b.fsn;
  }
  r.tot = { n, eg: +(e / n).toFixed(3), bias: +(s / n).toFixed(3), floorLake: +(fl / fln).toFixed(3), floorSolid: +(fs / fsn).toFixed(3) };
  r.con = A.con.map(([c, ee]) => ({ n: c, eg: +(ee / Math.max(1, c)).toFixed(3) }));
  out[q.name] = r;
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out));
const ref = seqs[0].name;
console.log(`frames ${k0}..${N - 1} stride ${stride}; edge-only error vs GT (max channel, levels); % vs ${ref}`);
console.log("box".padEnd(8) + seqs.map((q) => q.name.padStart(16)).join("") + "   floorLake floorSolid (" + ref + ")");
for (const nm of [...names, "tot"]) {
  const row = seqs.map((q) => {
    const v = nm === "tot" ? out[q.name].tot.eg : out[q.name].box[nm].eg;
    const r0 = nm === "tot" ? out[ref].tot.eg : out[ref].box[nm].eg;
    return (v.toFixed(3) + (q.name === ref ? "" : ` ${((100 * (v - r0)) / r0).toFixed(0)}%`)).padStart(16);
  });
  const fr = nm === "tot" ? out[ref].tot : out[ref].box[nm];
  console.log(nm.padEnd(8) + row.join("") + `   ${fr.floorLake} ${fr.floorSolid}  n=${fr.n}`);
}
console.log("bias".padEnd(8) + seqs.map((q) => String(out[q.name].tot.bias).padStart(16)).join(""));
for (let c = 0; c < 3; c++) console.log(["con<40", "con40-100", "con>100"][c].padEnd(8) + seqs.map((q) => `${out[q.name].con[c].eg} (${out[q.name].con[c].n})`.padStart(16)).join(""));
