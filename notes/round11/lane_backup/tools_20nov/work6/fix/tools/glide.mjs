// AA5a G1c GLIDE on real captures (cap.mjs sequences) + solid-side edge error vs GT.
//   node glide.mjs --mask MASKSEQ(capm, with cNNNN coverage) --motion crawl.json --seq NAME=DIR ... --gt NAME [--k0 1 --k1 239]
//                  [--out file.json] [--boxes FS,WR,...]
// Edges from the BASE geometry's coverage mask (same for all variants); per box, rows for near-vertical edges and columns for
// near-horizontal ones; per frame the sub-pixel position where the luma profile crosses the midpoint between its solid-side
// and lake-side levels (2-3 px out, smoothed +-3 frames along the track); jerk = RMS of the second time difference minus the
// box motion's change (crawl.json motions, smoothed +-4 frames); only samples valid in ALL variants. Also an area estimator
// (sum of the normalized profile, exact for any symmetric blur) as a cross-check.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { loadSeq, dilate } from "./lib.mjs";
import { findCrossings, linkTracks, smooth } from "./glidecore.mjs";
const argv = process.argv.slice(2);
const seqs = [];
let maskDir, motionFile, gtName, k0 = 1, k1 = 1e9, outFile, boxSel = null, solidStride = 2, minC = 24, frac = 0.5, cap = 1.0, dumpFile = null, noErr = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--mask") maskDir = argv[++i];
  else if (a === "--motion") motionFile = argv[++i];
  else if (a === "--seq") { const [n, d] = argv[++i].split("="); seqs.push({ name: n, s: loadSeq(d) }); }
  else if (a === "--gt") gtName = argv[++i];
  else if (a === "--k0") k0 = +argv[++i];
  else if (a === "--k1") k1 = +argv[++i];
  else if (a === "--out") outFile = argv[++i];
  else if (a === "--boxes") boxSel = argv[++i].split(",");
  else if (a === "--sstride") solidStride = +argv[++i];
  else if (a === "--minc") minC = +argv[++i];
  else if (a === "--frac") frac = +argv[++i];
  else if (a === "--cap") cap = +argv[++i];
  else if (a === "--dump") dumpFile = argv[++i];
  else if (a === "--noerr") noErr = true;
}
const M = loadSeq(maskDir);
const W = M.W, H = M.H, Y0 = M.y0;
const N = Math.min(M.n - 1, k1, ...seqs.map((q) => q.s.n - 1));
const covOf = (k) => {
  const b = zlib.inflateSync(fs.readFileSync(path.join(maskDir, `c${String(k).padStart(4, "0")}.bin`)));
  const o = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) o.set(b.subarray((H - 1 - y) * W, (H - y) * W), y * W);
  return o;
};
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const boxes = Object.fromEntries(Object.entries(BOXES).filter(([n]) => !boxSel || boxSel.includes(n)).map(([n, b]) => [n, [b[0], Math.max(0, b[1] - Y0), b[2], Math.min(H, b[3] - Y0)]]));
const boxNames = Object.keys(boxes);
// motion per frame per box (crawl.json from the same path), smoothed
let motion = null;
if (motionFile) {
  const mj = JSON.parse(fs.readFileSync(motionFile, "utf8"));
  motion = {};
  for (const n of boxNames) {
    const vx = new Array(N + 2).fill(NaN), vy = new Array(N + 2).fill(NaN);
    for (const m of mj.motions) if (m.k <= N + 1 && m.v[n]) { vx[m.k] = m.v[n][0]; vy[m.k] = m.v[n][1]; }
    motion[n] = [smooth(vx, 4), smooth(vy, 4)];
  }
}
// pass 1: crossings and tracks from the coverage mask
const perBoxFrames = Object.fromEntries(boxNames.map((n) => [n, []]));
const heroOf = (k) => {
  const m = M.mask(k);
  const h = new Uint8Array(W * H);
  for (let i = 0; i < h.length; i++) h[i] = m[i] & 4 ? 1 : 0;
  return dilate(h, W, H, 6);
};
const covCache = [];
for (let k = k0 - 1; k <= N; k++) {
  const cov = covOf(k), hero = heroOf(k);
  for (const n of boxNames) {
    const cr = [...findCrossings(cov, hero, W, H, boxes[n], 0), ...findCrossings(cov, hero, W, H, boxes[n], 1)];
    perBoxFrames[n].push(cr.map((c) => ({ ...c, k })));
  }
}
const tracks = {};
const itemsByFrame = new Map();
let nItems = 0;
for (const n of boxNames) {
  tracks[n] = linkTracks(perBoxFrames[n]);
  for (const t of tracks[n]) {
    t.box = n;
    t.prof = seqs.map(() => []);
    for (let i = 0; i < t.items.length; i++) {
      const it = t.items[i];
      if (!itemsByFrame.has(it.k)) itemsByFrame.set(it.k, []);
      itemsByFrame.get(it.k).push([t, i]);
      nItems++;
    }
  }
}
// pass 2: profiles (luma, offsets -4..+5 from the boundary pair's first pixel) per variant
const lumaOf = (F) => {
  const o = new Float32Array(W * H);
  for (let i = 0; i < o.length; i++) o[i] = 0.2126 * F[i * 4] + 0.7152 * F[i * 4 + 1] + 0.0722 * F[i * 4 + 2];
  return o;
};
const gti = seqs.findIndex((q) => q.name === gtName);
const err = Object.fromEntries(seqs.map((q) => [q.name, Object.fromEntries(boxNames.map((n) => [n, { sE: 0, sN: 0, lE: 0, lN: 0, fE: 0, fN: 0 }]))]));
for (let k = k0 - 1; k <= N; k++) {
  const items = itemsByFrame.get(k) || [];
  const doErr = !noErr && gti >= 0 && k >= k0 && (k - k0) % solidStride === 0;
  let cov = null, hero = null, edge = null, near2 = null, near5 = null, GT = null;
  if (doErr) {
    cov = covOf(k);
    hero = heroOf(k);
    edge = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const me = cov[i] >= 128;
        let mixed = false;
        for (let dy = -1; dy <= 1 && !mixed; dy++) for (let dx = -1; dx <= 1; dx++) if ((cov[i + dy * W + dx] >= 128) !== me) { mixed = true; break; }
        if (mixed) edge[i] = 1;
      }
    near2 = dilate(edge, W, H, 2);
    near5 = dilate(edge, W, H, 5);
    GT = seqs[gti].s.frame(k);
  }
  for (let vi = 0; vi < seqs.length; vi++) {
    const F = seqs[vi].s.frame(k);
    const I = lumaOf(F);
    for (const [t, i] of items) {
      const c = t.items[i].c;
      const p = new Float32Array(10);
      for (let o = -4; o <= 5; o++) p[o + 4] = c.dir === 0 ? I[c.line * W + c.s + o] : I[(c.s + o) * W + c.line];
      t.prof[vi][i] = p;
    }
    if (doErr) {
      const e = err[seqs[vi].name];
      for (const n of boxNames) {
        const [x0, y0, x1, y1] = boxes[n];
        const b = e[n];
        for (let y = Math.max(1, y0); y < Math.min(H - 1, y1); y++)
          for (let x = Math.max(1, x0); x < Math.min(W - 1, x1); x++) {
            const i = y * W + x;
            if (hero[i]) continue;
            const q = i * 4;
            const d = Math.max(Math.abs(F[q] - GT[q]), Math.abs(F[q + 1] - GT[q + 1]), Math.abs(F[q + 2] - GT[q + 2]));
            if (edge[i]) {
              if (cov[i] < 128) { b.sE += d; b.sN++; } else { b.lE += d; b.lN++; }
            } else if (!near2[i] && near5[i] && cov[i] === 0) { b.fE += d; b.fN++; }
          }
      }
    }
  }
}
// pass 3: positions and jerk
const posCross = (p, pol, Sv, Lv) => {
  const mid = Sv + frac * (Lv - Sv);
  let best = null;
  // pairs j = s-2..s+2 -> indices 2..6 (and +1)
  for (let j = 2; j <= 6; j++) {
    const a = p[j] - mid, b = p[j + 1] - mid;
    if (a * b > 0 || (a === 0 && b === 0)) continue;
    const x = j - 4 + 0.5 + a / (a - b); // relative to s
    if (best === null || Math.abs(x - 1) < Math.abs(best - 1)) best = x; // mask boundary at s + 1 (between s and s+1)
  }
  return best;
};
const posArea = (p, pol, Sv, Lv) => {
  let sum = 0;
  for (let j = 1; j <= 8; j++) sum += Math.min(1.25, Math.max(-0.25, (p[j] - Sv) / (Lv - Sv)));
  // indices 1..8 = s-3..s+4; lake on + side: e = (s+5) - sum; lake on - side: e = (s-3) + sum  (relative to s)
  return pol === 1 ? 5 - sum : -3 + sum;
};
const posArea5 = (p, pol, Sv, Lv) => {
  let sum = 0;
  for (let j = 2; j <= 6; j++) sum += Math.min(1.25, Math.max(-0.25, (p[j] - Sv) / (Lv - Sv)));
  // indices 2..6 = s-2..s+2: lake on + side: e = (s+3) - sum; lake on - side: e = (s-2) + sum
  return pol === 1 ? 3 - sum : -2 + sum;
};
const EST = ["cross", "area", "area5"];
const res = {}, rel = {}, bins = {}, binsR = {};
for (const est of EST) {
  bins[est] = [0, 1, 2].map(() => seqs.map(() => []));
  binsR[est] = [0, 1, 2].map(() => seqs.map(() => []));
  rel[est] = {};
  for (const n of [...boxNames, "ALL"]) rel[est][n] = seqs.map(() => []);
  res[est] = {};
  for (const n of [...boxNames, "ALL"]) res[est][n] = seqs.map(() => []);
}
let nTracks = 0;
let dbgN = 0;
const esf = seqs.map(() => new Float64Array(49)), esfN = seqs.map(() => new Float64Array(49));
const drop = { cross: 0, area: 0, area5: 0 }, keep = { cross: 0, area: 0, area5: 0 };
const dumped = [];
for (const n of boxNames)
  for (const t of tracks[n]) {
    nTracks++;
    const L = t.items.length;
    const pos = { cross: seqs.map(() => new Array(L).fill(NaN)), area: seqs.map(() => new Array(L).fill(NaN)), area5: seqs.map(() => new Array(L).fill(NaN)) };
    for (let vi = 0; vi < seqs.length; vi++) {
      const S = [], Lk = [];
      for (let i = 0; i < L; i++) {
        const p = t.prof[vi][i];
        const pol = t.items[i].c.pol;
        S.push(pol === 1 ? 0.5 * (p[2] + p[1]) : 0.5 * (p[7] + p[8]));
        Lk.push(pol === 1 ? 0.5 * (p[7] + p[8]) : 0.5 * (p[2] + p[1]));
      }
      const Ss = smooth(S, 3), Ls = smooth(Lk, 3);
      for (let i = 0; i < L; i++) {
        if (Math.abs(Ls[i] - Ss[i]) < minC) continue;
        const p = t.prof[vi][i], c = t.items[i].c;
        const x = posCross(p, c.pol, Ss[i], Ls[i]);
        if (x !== null) pos.cross[vi][i] = c.s + x;
        pos.area[vi][i] = c.s + posArea(p, c.pol, Ss[i], Ls[i]);
        pos.area5[vi][i] = c.s + posArea5(p, c.pol, Ss[i], Ls[i]);
      }
    }
    if (gti >= 0) for (let i = 0; i < L; i++) {
      const pg = pos.area5[gti][i];
      if (!Number.isFinite(pg)) continue;
      let ok = true;
      for (let vi = 0; vi < seqs.length && ok; vi++) if (!Number.isFinite(pos.area5[vi][i])) ok = false;
      if (!ok) continue;
      const c = t.items[i].c;
      for (let vi = 0; vi < seqs.length; vi++) {
        const p = t.prof[vi][i];
        const Sv = c.pol === 1 ? 0.5 * (p[2] + p[1]) : 0.5 * (p[7] + p[8]);
        const Lv = c.pol === 1 ? 0.5 * (p[7] + p[8]) : 0.5 * (p[2] + p[1]);
        if (Math.abs(Lv - Sv) < 40) continue;
        for (let j = 0; j < 10; j++) {
          const x = (c.s - 4 + j + 0.5 - pg) * c.pol; // signed distance, + = towards the lake
          const b = Math.round(x * 4) + 24;
          if (b < 0 || b > 48) continue;
          esf[vi][b] += (p[j] - Sv) / (Lv - Sv);
          esfN[vi][b]++;
        }
      }
    }
    if (dumpFile && L >= 40) dumped.push({ box: n, dir: t.dir, line: t.items[0].c.line, k0: t.items[0].k, s: t.items.map((it) => it.c.xm), cross: pos.cross, area: pos.area });
    for (let i = 1; i < L - 1; i++) {
      const ka = t.items[i - 1].k, kb = t.items[i].k, kc = t.items[i + 1].k;
      if (kb !== ka + 1 || kc !== kb + 1 || kb < k0) continue;
      const acc = motion ? (motion[n][t.dir][kc] - motion[n][t.dir][kb]) || 0 : 0;
      for (const est of EST) {
        const P = pos[est];
        let ok = true;
        for (let vi = 0; vi < seqs.length && ok; vi++) if (!Number.isFinite(P[vi][i - 1]) || !Number.isFinite(P[vi][i]) || !Number.isFinite(P[vi][i + 1])) ok = false;
        if (!ok) continue;
        const d2s = seqs.map((_, vi) => P[vi][i + 1] - 2 * P[vi][i] + P[vi][i - 1] - acc);
        if (d2s.some((x) => Math.abs(x) > cap)) { drop[est]++; continue; }
        if (process.env.DBG && est === "cross" && Math.abs(d2s[+process.env.DBG]) > 0.3 && dbgN++ < 12) {
          console.log(`DBG ${n} dir ${t.dir} line ${t.items[i].c.line} k ${t.items[i].k} pol ${t.items[i].c.pol} s ${t.items[i].c.s} d2 ${d2s.map((x) => x.toFixed(2)).join(" ")}`);
          for (let vi = 0; vi < seqs.length; vi++) for (const j of [i - 1, i, i + 1]) console.log(`   ${seqs[vi].name.padEnd(5)} k${t.items[j].k} xm ${t.items[j].c.xm.toFixed(2)} p ${P[vi][j].toFixed(2)}  prof ${Array.from(t.prof[vi][j]).map((v) => v.toFixed(0).padStart(4)).join("")}`);
        }
        keep[est]++;
        // local edge speed along the line (GT's area5 position when available, else this estimator's first variant)
        const PV = gti >= 0 && Number.isFinite(pos.area5[gti][i + 1]) && Number.isFinite(pos.area5[gti][i - 1]) ? pos.area5[gti] : P[0];
        const vloc = Math.abs(PV[i + 1] - PV[i - 1]) / 2;
        const bin = vloc < 0.15 ? 0 : vloc < 0.5 ? 1 : 2;
        for (let vi = 0; vi < seqs.length; vi++) {
          bins[est][bin][vi].push(d2s[vi]);
          if (gti >= 0) binsR[est][bin][vi].push(d2s[vi] - d2s[gti]);
        }
        for (let vi = 0; vi < seqs.length; vi++) {
          res[est][n][vi].push(d2s[vi]);
          res[est].ALL[vi].push(d2s[vi]);
          if (gti >= 0) {
            const r = d2s[vi] - d2s[gti];
            rel[est][n][vi].push(r);
            rel[est].ALL[vi].push(r);
          }
        }
      }
    }
  }
const stat = (a) => {
  const n = a.length;
  if (!n) return { n: 0, rms: NaN, p95: NaN, f10: NaN };
  let s2 = 0, c = 0;
  for (const x of a) { s2 += x * x; if (Math.abs(x) > 0.1) c++; }
  const so = a.map(Math.abs).sort((x, y) => x - y);
  return { n, rms: +Math.sqrt(s2 / n).toFixed(4), p95: +so[Math.floor(0.95 * (n - 1))].toFixed(4), f10: +(c / n).toFixed(4) };
};
const summary = { frames: [k0, N], tracks: nTracks, items: nItems, jerk: {}, solid: {} };
const names = seqs.map((q) => q.name);
summary.bins = {};
for (const est of EST) summary.bins[est] = [0, 1, 2].map((b) => ({ abs: Object.fromEntries(names.map((nm, vi) => [nm, stat(bins[est][b][vi])])), rel: Object.fromEntries(names.map((nm, vi) => [nm, stat(binsR[est][b][vi])])) }));
summary.rel = {};
for (const est of EST) {
  summary.rel[est] = {};
  for (const n of [...boxNames, "ALL"]) summary.rel[est][n] = Object.fromEntries(names.map((nm, vi) => [nm, stat(rel[est][n][vi])]));
}
for (const est of EST) {
  summary.jerk[est] = {};
  for (const n of [...boxNames, "ALL"]) summary.jerk[est][n] = Object.fromEntries(names.map((nm, vi) => [nm, stat(res[est][n][vi])]));
}
for (const nm of names) {
  summary.solid[nm] = {};
  let tS = 0, tN = 0, tL = 0, tLN = 0, tF = 0, tFN = 0;
  for (const n of boxNames) {
    const b = err[nm][n];
    summary.solid[nm][n] = { solid: +(b.sE / Math.max(1, b.sN)).toFixed(3), lake: +(b.lE / Math.max(1, b.lN)).toFixed(3), floor: +(b.fE / Math.max(1, b.fN)).toFixed(3), n: b.sN };
    tS += b.sE; tN += b.sN; tL += b.lE; tLN += b.lN; tF += b.fE; tFN += b.fN;
  }
  summary.solid[nm].ALL = { solid: +(tS / Math.max(1, tN)).toFixed(3), lake: +(tL / Math.max(1, tLN)).toFixed(3), floor: +(tF / Math.max(1, tFN)).toFixed(3), n: tN };
}
if (gti >= 0) {
  summary.esf = {};
  console.log("mean ESF (solid -> lake, aligned on GT's position): width 10-90 % / 50 % offset (px)");
  const line = [];
  for (let vi = 0; vi < seqs.length; vi++) {
    const m = Array.from(esf[vi], (v, b) => (esfN[vi][b] ? v / esfN[vi][b] : NaN));
    const xAt = (lv) => {
      for (let b = 0; b < 48; b++) if (m[b] <= lv && m[b + 1] > lv) return (b - 24 + (lv - m[b]) / (m[b + 1] - m[b])) / 4;
      return NaN;
    };
    const w = xAt(0.9) - xAt(0.1), o = xAt(0.5);
    summary.esf[seqs[vi].name] = { w10_90: +w.toFixed(3), off50: +o.toFixed(3), m: m.map((v) => +v.toFixed(3)) };
    line.push(`${seqs[vi].name} ${w.toFixed(2)} / ${o.toFixed(2)}`);
  }
  console.log("  " + line.join("   "));
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(summary, null, 1));
if (dumpFile) fs.writeFileSync(dumpFile, JSON.stringify({ names: seqs.map((q) => q.name), tracks: dumped }));
console.log(`frames ${k0}..${N}, tracks ${nTracks}, items ${nItems}; level ${frac}, min contrast ${minC}, cap ${cap}: dropped cross ${(100 * drop.cross / Math.max(1, drop.cross + keep.cross)).toFixed(1)} % / area ${(100 * drop.area / Math.max(1, drop.area + keep.area)).toFixed(1)} % / area5 ${(100 * drop.area5 / Math.max(1, drop.area5 + keep.area5)).toFixed(1)} %`);
summary.drop = drop; summary.keep = keep;
for (const est of EST) {
  console.log(`JERK RMS (${est}) px`.padEnd(22) + names.map((n) => n.padStart(10)).join("") + "   n");
  for (const n of [...boxNames, "ALL"]) console.log(`  ${n}`.padEnd(22) + names.map((nm) => summary.jerk[est][n][nm].rms.toFixed(4).padStart(10)).join("") + `   ${summary.jerk[est][n][names[0]].n}`);
}
if (gti >= 0) for (const est of ["area5", "cross"]) {
  console.log(`REL-to-GT JERK (${est})`.padEnd(22) + names.map((n) => n.padStart(10)).join(""));
  for (const n of [...boxNames, "ALL"]) console.log(`  ${n}`.padEnd(22) + names.map((nm) => summary.rel[est][n][nm].rms.toFixed(4).padStart(10)).join(""));
}
for (const est of ["area5", "cross"]) {
  console.log(`BY EDGE SPEED (${est})`.padEnd(22) + names.map((n) => n.padStart(10)).join("") + "   n   [abs | rel]");
  ["v<0.15", "0.15-0.5", "v>=0.5"].forEach((lab, b) => {
    console.log(`  abs ${lab}`.padEnd(22) + names.map((nm) => summary.bins[est][b].abs[nm].rms.toFixed(4).padStart(10)).join("") + `   ${summary.bins[est][b].abs[names[0]].n}`);
    if (gti >= 0) console.log(`  rel ${lab}`.padEnd(22) + names.map((nm) => summary.bins[est][b].rel[nm].rms.toFixed(4).padStart(10)).join(""));
  });
}
console.log("f(|d2|>0.1)".padEnd(22) + names.map((nm) => summary.jerk.cross.ALL[nm].f10.toFixed(3).padStart(10)).join(""));
if (gti >= 0) {
  console.log("SOLID-side edge err".padEnd(22) + names.map((n) => n.padStart(10)).join(""));
  for (const n of [...boxNames, "ALL"]) console.log(`  ${n}`.padEnd(22) + names.map((nm) => summary.solid[nm][n].solid.toFixed(2).padStart(10)).join("") + `   (floor ${summary.solid[names[0]][n].floor}, lake-side ${names.map((nm) => summary.solid[nm][n].lake.toFixed(2)).join("/")})`);
}
