// AA5b pop scan: frame-to-frame jumps the GT does not have, on the waterline band.
//   node popscan.mjs --mask MASKSEQ --gt GTSEQ [--thr 40] [--r 3] [--minpx 6] [--k0 1] [--k1 240] [--json OUT] NAME=SEQ ...
// e = maxch|X(k) - X(k-1)| - maxch|GT(k) - GT(k-1)|; flagged where e > thr on the band (lake / solid boundary +- r px from the
// clean mask, hero dilated 6 px excluded). Flagged px -> 8-connected components per frame -> events linked over consecutive
// frames (bboxes within 3 px). Lists events with >= minpx px.
import fs from "node:fs";
import { loadSeq, bandFromMask, luma8 } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
  else { const [n, p] = argv[i].split("="); seqs.push({ name: n, s: loadSeq(p) }); }
}
const thr = +(opt.thr || 40), r = +(opt.r || 3), minpx = +(opt.minpx || 6);
const M = loadSeq(opt.mask), G = loadSeq(opt.gt);
const W = M.W, H = M.H, y0 = M.y0;
const k0 = +(opt.k0 || 1), k1 = Math.min(+(opt.k1 || 1e9), M.n, G.n, ...seqs.map((q) => q.s.n));
const res = {};
for (const q of seqs) res[q.name] = { events: [], flagged: 0, open: [] };
for (let k = k0; k < k1; k++) {
  const { band } = bandFromMask(M.mask(k), W, H, r);
  const g1 = G.frame(k), g0 = G.frame(k - 1);
  for (const q of seqs) {
    const X = q.s, R = res[q.name];
    const a1 = X.frame(k), a0 = X.frame(k - 1);
    const fl = new Uint8Array(W * H);
    const ev = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!band[i]) continue;
      const ia = ((y + y0 - X.y0) * X.W + x) * 4, ig = ((y + y0 - G.y0) * G.W + x) * 4;
      const dx = Math.max(Math.abs(a1[ia] - a0[ia]), Math.abs(a1[ia + 1] - a0[ia + 1]), Math.abs(a1[ia + 2] - a0[ia + 2]));
      const dg = Math.max(Math.abs(g1[ig] - g0[ig]), Math.abs(g1[ig + 1] - g0[ig + 1]), Math.abs(g1[ig + 2] - g0[ig + 2]));
      const e = dx - dg;
      if (e > thr) { fl[i] = 1; ev[i] = e; R.flagged++; }
    }
    // components
    const lab = new Int32Array(W * H).fill(-1);
    const comps = [];
    const st = [];
    for (let i = 0; i < fl.length; i++) {
      if (!fl[i] || lab[i] >= 0) continue;
      const c = { n: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1, emax: 0, dl: 0 };
      lab[i] = comps.length; st.push(i);
      while (st.length) {
        const j = st.pop(); const x = j % W, y = (j / W) | 0;
        c.n++; c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y + y0); c.y1 = Math.max(c.y1, y + y0);
        c.emax = Math.max(c.emax, ev[j]);
        const ia = ((y + y0 - X.y0) * X.W + x) * 4;
        c.dl += luma8(a1[ia], a1[ia + 1], a1[ia + 2]) - luma8(a0[ia], a0[ia + 1], a0[ia + 2]);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const jj = yy * W + xx;
          if (fl[jj] && lab[jj] < 0) { lab[jj] = lab[i]; st.push(jj); }
        }
      }
      c.dl /= c.n;
      comps.push(c);
    }
    // link to open events (from frame k-1)
    const nextOpen = [];
    for (const c of comps) {
      let e = R.open.find((o) => o.x0 - 3 <= c.x1 && c.x0 <= o.x1 + 3 && o.y0 - 3 <= c.y1 && c.y0 <= o.y1 + 3);
      if (!e) { e = { k0: k, k1: k, x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, n: 0, emax: 0, frames: [] }; R.events.push(e); }
      e.k1 = k; e.n += c.n; e.emax = Math.max(e.emax, c.emax);
      e.x0 = Math.min(e.x0, c.x0); e.x1 = Math.max(e.x1, c.x1); e.y0 = Math.min(e.y0, c.y0); e.y1 = Math.max(e.y1, c.y1);
      e.frames.push([k, c.n, Math.round(c.emax), Math.round(c.dl)]);
      if (!nextOpen.includes(e)) nextOpen.push(e);
    }
    R.open = nextOpen.map((e) => ({ ...e, ...e })).map((e) => e) && nextOpen;
  }
}
const out = {};
for (const q of seqs) {
  const R = res[q.name];
  const big = R.events.filter((e) => e.n >= minpx).sort((a, b) => b.n * b.emax - a.n * a.emax);
  out[q.name] = { flagged: R.flagged, events: big.length, list: big };
  console.log(`${q.name}: flagged px ${R.flagged}, events >= ${minpx} px: ${big.length}, px in them ${big.reduce((s, e) => s + e.n, 0)}`);
}
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out));
const top = +(opt.top || 12);
for (const q of seqs) {
  console.log(`-- ${q.name} top ${top}`);
  for (const e of out[q.name].list.slice(0, top))
    console.log(`  k${e.k0}-${e.k1} x${e.x0}-${e.x1} y${e.y0}-${e.y1} n${e.n} emax${Math.round(e.emax)} frames ${e.frames.slice(0, 4).map((f) => f.join("/")).join(" ")}${e.frames.length > 4 ? " ..." : ""}`);
}
