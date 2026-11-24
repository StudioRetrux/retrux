// AA4X: error vs the 16-sample GT on EDGE pixels only (3x3 of the mask holds lake AND solid; hero dilated 6 px excluded),
// per box, plus the band's non-edge ring (floor: texture / shading differences that no edge AA can remove).
//   node edgeerr.mjs --mask MASKSEQ --gt GTSEQ --seq NAME=DIR [--seq ...] [--k0 1] [--k1 N] [--stride 1] [--out f.json]
// Per box and variant: eE = mean max-channel |F - GT| on edge px, eR = RMS luma error on edge px, sL = mean signed luma
// (F - GT) on edge px, eN = mean max-channel |F - GT| on band px that are not edge px (the floor).
import fs from "node:fs";
import { loadSeq, bandFromMask, dilate } from "./lib.mjs";

const argv = process.argv.slice(2);
const seqs = [];
let maskDir = null, gtDir = null, outFile = null, k0 = 1, k1 = Infinity, stride = 1;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--mask") maskDir = argv[++i];
  else if (a === "--gt") gtDir = argv[++i];
  else if (a === "--seq") {
    const [n, d] = argv[++i].split("=");
    seqs.push({ name: n, s: loadSeq(d) });
  } else if (a === "--out") outFile = argv[++i];
  else if (a === "--k0") k0 = +argv[++i];
  else if (a === "--k1") k1 = +argv[++i];
  else if (a === "--stride") stride = +argv[++i];
}
const M = loadSeq(maskDir);
const G = loadSeq(gtDir);
const W = M.W, H = M.H, Y0 = M.y0;
const N = Math.min(M.n, G.n, ...seqs.map((q) => q.s.n), k1 + 1);
const sx = W / 1440;
const BOXES = {
  FS: [180, 600, 430, 720],
  WR: [990, 650, 1215, 725],
  DR: [350, 690, 660, 766],
  FF: [0, 445, 680, 560],
  FR: [900, 450, 1440, 515],
  RS: [940, 590, 1440, 655],
};
const boxes = Object.fromEntries(Object.entries(BOXES).map(([k, b]) => [k, [Math.round(b[0] * sx), Math.max(0, Math.round(b[1] * sx) - Y0), Math.round(b[2] * sx), Math.min(H, Math.round(b[3] * sx) - Y0)]]));
const names = Object.keys(boxes);
const boxOf = new Int8Array(W * H).fill(-1);
names.forEach((n, bi) => {
  const [x0, y0, x1, y1] = boxes[n];
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = x0; x < x1; x++) if (boxOf[y * W + x] < 0) boxOf[y * W + x] = bi;
});
const res = Object.fromEntries(seqs.map((q) => [q.name, Object.fromEntries([...names, "tot"].map((n) => [n, { n: 0, e: 0, r: 0, s: 0, nn: 0, en: 0 }]))]));
for (let k = k0; k < N; k += stride) {
  const m = M.mask(k);
  const { band, lake, solid, hero } = bandFromMask(m, W, H, 3);
  const edge = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (hero[i]) continue;
      let l = 0, s = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const j = i + dy * W + dx;
          l |= lake[j];
          s |= solid[j];
        }
      if (l && s) edge[i] = 1;
    }
  const g = G.frame(k);
  for (const q of seqs) {
    const F = q.s.frame(k);
    const r = res[q.name];
    for (let i = 0; i < W * H; i++) {
      const bi = boxOf[i];
      if (bi < 0) continue;
      const p = i * 4;
      const d = Math.max(Math.abs(F[p] - g[p]), Math.abs(F[p + 1] - g[p + 1]), Math.abs(F[p + 2] - g[p + 2]));
      const dl = 0.2126 * (F[p] - g[p]) + 0.7152 * (F[p + 1] - g[p + 1]) + 0.0722 * (F[p + 2] - g[p + 2]);
      for (const b of [r[names[bi]], r.tot]) {
        if (edge[i]) {
          b.n++;
          b.e += d;
          b.r += dl * dl;
          b.s += dl;
        } else if (band[i]) {
          b.nn++;
          b.en += d;
        }
      }
    }
  }
}
const out = {};
for (const q of seqs) {
  out[q.name] = {};
  for (const n of [...names, "tot"]) {
    const b = res[q.name][n];
    out[q.name][n] = { n: b.n, eE: +(b.e / Math.max(1, b.n)).toFixed(3), eR: +Math.sqrt(b.r / Math.max(1, b.n)).toFixed(3), sL: +(b.s / Math.max(1, b.n)).toFixed(3), eN: +(b.en / Math.max(1, b.nn)).toFixed(3) };
  }
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out));
const ref = seqs[0].name;
console.log(`frames ${k0}..${N - 1} stride ${stride}; edge px = 3x3 holds lake AND solid (hero excluded); eE |F-GT| max ch, eR RMS luma, sL signed luma, eN non-edge band floor`);
console.log("box.metric".padEnd(12) + seqs.map((q) => q.name.padStart(16)).join(""));
for (const n of [...names, "tot"]) {
  for (const key of ["eE", "eR", "sL", "eN"]) {
    console.log(`${n}.${key}`.padEnd(12) + seqs.map((q) => {
      const v = out[q.name][n][key], r0 = out[ref][n][key];
      const pct = q.name !== ref && r0 > 0 && key !== "sL" ? ` ${((100 * (v - r0)) / r0).toFixed(0)}%` : "";
      return (String(v) + pct).padStart(16);
    }).join(""));
  }
  console.log(`${n}.n`.padEnd(12) + String(out[ref][n].n).padStart(16));
}
