// Time slices per box: picks, from the BASE masks, the row in the box (and a WIN-px window) where the waterline crosses most often
// over the sequence, then writes SEQ1 | SEQ2 | ... slices (x across, frames down), nearest zoom.
//   node slices.mjs --mask MASKSEQ --tag slow --outdir DIR [--win 100] [--zoom 3] [--k0 0 --k1 240] [--box FS,WR] [--rowfix FS=690] NAME=SEQ ...
import { loadSeq, png, hstack } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else { const [n, d] = argv[i].split("="); seqs.push({ name: n, s: loadSeq(d) }); } }
const M = loadSeq(opt.mask); const W = M.W, H = M.H, Y0 = M.y0;
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const win = +(opt.win || 100), zoom = +(opt.zoom || 3), k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), M.n, ...seqs.map((q) => q.s.n));
const which = (opt.box || Object.keys(BOXES).join(",")).split(",");
const fix = Object.fromEntries((opt.rowfix || "").split(",").filter(Boolean).map((s) => s.split("=")).map(([a, b]) => [a, b.split(":").map(Number)]));
// edge crossings per (row, x): lake/solid transitions horizontally, summed over frames (every 4th)
const cnt = new Float32Array(W * H);
for (let k = k0; k < k1; k += 4) { const m = M.mask(k); for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) { const a = m[y * W + x] & 1, b = m[y * W + x - 1] & 1, h = (m[y * W + x] | m[y * W + x - 1]) & 4; if (a !== b && !h) cnt[y * W + x]++; } }
const picks = {};
for (const bn of which) {
  const [bx0, by0, bx1, by1] = BOXES[bn];
  let best = -1, by = 0, bx = bx0;
  for (let y = Math.max(by0, Y0); y < Math.min(by1, Y0 + H); y++) {
    if (fix[bn] && fix[bn][0] !== y) continue;
    const r = (y - Y0) * W; let s = 0;
    for (let x = bx0; x < Math.min(bx1, bx0 + win); x++) s += cnt[r + x];
    for (let x = bx0; x + win <= bx1; x++) {
      if (x > bx0) s += cnt[r + x + win - 1] - cnt[r + x - 1];
      const xx = fix[bn] && fix[bn][1] !== undefined ? fix[bn][1] : x;
      if (fix[bn] && fix[bn][1] !== undefined && x !== xx) continue;
      if (s > best) { best = s; by = y; bx = x; }
    }
  }
  picks[bn] = { row: by, x0: bx, x1: bx + win, crossings: best };
  const imgs = seqs.map((q) => { const o = new Uint8Array(win * (k1 - k0) * 4); for (let k = k0; k < k1; k++) { const f = q.s.frame(k); const yy = by - q.s.y0; o.set(f.subarray((yy * q.s.W + bx) * 4, (yy * q.s.W + bx + win) * 4), (k - k0) * win * 4); } return o; });
  const st = hstack(imgs, win, k1 - k0, 4);
  const file = `${opt.outdir}/slice_${opt.tag}_${bn}_r${by}_x${bx}_${seqs.map((q) => q.name).join("_")}.png`;
  png(st.img, st.W, st.H, file, { zoom });
  console.log(bn, JSON.stringify(picks[bn]), file.split("/").pop());
}
