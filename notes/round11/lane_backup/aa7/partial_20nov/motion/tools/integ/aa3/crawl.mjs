// AA3 metrics on the waterline bands of one camera path, several variants (same deterministic path).
//   node crawl.mjs --mask MASKSEQ --seq NAME=DIR [--seq NAME=DIR ...] [--ref NAME] [--out file.json] [--k0 1] [--k1 N]
// Per region box (rest-pose boxes, intersected with the per-frame band = lake / solid boundary +-3 px from the mask session):
//   J32 / J48: band pixels whose value jumps > 32 / 48 levels (max channel) from the previous frame, per 1000 band px-frames
//   FLK: mean |dF| on the band (levels)
//   MC32 / MCE: motion-compensated: frame t vs frame t-1 shifted by the box's own motion (sub-pixel registration of the REF
//        variant's frames, Catmull-Rom resampling): band px with residual > 32, mean residual (levels)
// Texture (G3): mean squared luma gradient of the lake interior (lake eroded 4 px, no hero, no band) and of the solid interior
//   (ice / snow / rock, eroded 4 px, boxes only), per variant, mean over frames; ratio to REF.
// Halos (G4): pixels more than 4 levels outside REF's 3x3 per-channel range at the same frame (whole crop, band, rest).
import fs from "node:fs";
import { loadSeq, bandFromMask, dilate } from "./lib.mjs";

const argv = process.argv.slice(2);
const seqs = [];
let gtName = null;
let maskDir = null, refName = null, outFile = null, k0 = 1, k1 = Infinity, stride = 1;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--mask") maskDir = argv[++i];
  else if (a === "--seq") {
    const [n, d] = argv[++i].split("=");
    seqs.push({ name: n, s: loadSeq(d) });
  } else if (a === "--ref") refName = argv[++i];
  else if (a === "--gt") gtName = argv[++i];
  else if (a === "--out") outFile = argv[++i];
  else if (a === "--k0") k0 = +argv[++i];
  else if (a === "--k1") k1 = +argv[++i];
  else if (a === "--stride") stride = +argv[++i];
}
const M = loadSeq(maskDir);
const W = M.W, H = M.H, Y0 = M.y0;
const ref = seqs.find((q) => q.name === (refName ?? seqs[0].name));
for (const q of seqs) {
  if (q.s.W !== W || q.s.H !== H || q.s.y0 !== Y0) throw new Error("crop mismatch " + q.name);
  let dmax = 0;
  for (let k = 0; k < Math.min(q.s.n, M.n); k++) {
    const a = q.s.meta.info[k].pos, b = M.meta.info[k].pos;
    dmax = Math.max(dmax, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  }
  if (dmax > 1e-6) console.log(`WARN pose mismatch ${q.name}: ${dmax}`);
}
const N = Math.min(M.n, ...seqs.map((q) => q.s.n), k1 + 1);

// Rest-pose boxes (1440 x 766 frame), y in frame coordinates; scaled with the frame width.
const sx = W / 1440;
const BOXES = {
  FS: [180, 600, 430, 720], // front slab (left front snow slab's waterline)
  WR: [990, 650, 1215, 725], // white rock (right)
  DR: [350, 690, 660, 766], // dark rocks (bottom centre)
  FF: [0, 445, 680, 560], // floes left / far floes
  FR: [900, 450, 1440, 515], // far floes right
  RS: [940, 590, 1440, 655], // right slab feet
};
// phones (portrait 390 x 844): far floes / horizon band, near rocks and slabs at the bottom, the rest
const BOXES_T0 = { FAR: [0, 470, 390, 600], NEAR: [0, 680, 390, 844], MID: [0, 600, 390, 680] };
const t0 = W < 800;
const boxes = t0
  ? Object.fromEntries(Object.entries(BOXES_T0).map(([k, b]) => [k, [b[0], Math.max(0, b[1] - Y0), b[2], Math.min(H, b[3] - Y0)]]))
  : Object.fromEntries(
      Object.entries(BOXES).map(([k, b]) => [k, [Math.round(b[0] * sx), Math.max(0, Math.round(b[1] * sx) - Y0), Math.round(b[2] * sx), Math.min(H, Math.round(b[3] * sx) - Y0)]]),
    );
const boxOf = new Int8Array(W * H).fill(-1);
const boxNames = Object.keys(boxes);
boxNames.forEach((n, bi) => {
  const [x0, y0, x1, y1] = boxes[n];
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = x0; x < x1; x++) if (boxOf[y * W + x] < 0) boxOf[y * W + x] = bi;
});

const L = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
const lumaImg = (f) => {
  const o = new Float32Array(W * H);
  for (let i = 0; i < o.length; i++) o[i] = L(f, i);
  return o;
};
// Catmull-Rom sample of a float image (luma) or RGBA channel
const cr = (t) => {
  const t2 = t * t, t3 = t2 * t;
  return [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2];
};
function sampleRGB(f, x, y, out) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const wx = cr(x - xi), wy = cr(y - yi);
  out[0] = out[1] = out[2] = 0;
  for (let j = 0; j < 4; j++) {
    const yy = Math.min(H - 1, Math.max(0, yi - 1 + j));
    for (let i = 0; i < 4; i++) {
      const xx = Math.min(W - 1, Math.max(0, xi - 1 + i));
      const w = wx[i] * wy[j], p = (yy * W + xx) * 4;
      out[0] += w * f[p];
      out[1] += w * f[p + 1];
      out[2] += w * f[p + 2];
    }
  }
}
// integer + parabolic sub-pixel registration of box b between luma images A (t-1) and B (t): B(x) ~ A(x - v)
function register(A, B, b, R = 14) {
  const [x0, y0, x1, y1] = b;
  const xs = Math.max(x0, R + 2), xe = Math.min(x1, W - R - 2), ys = Math.max(y0, R + 2), ye = Math.min(y1, H - R - 2);
  if (xe - xs < 8 || ye - ys < 8) return [0, 0];
  const ssd = (dx, dy) => {
    let s = 0;
    for (let y = ys; y < ye; y += 1)
      for (let x = xs; x < xe; x += 1) {
        const d = B[y * W + x] - A[(y - dy) * W + (x - dx)];
        s += d * d;
      }
    return s;
  };
  let best = [0, 0], bs = Infinity;
  // coarse-to-fine: integer search
  for (let dy = -4; dy <= 4; dy++) for (let dx = -R; dx <= R; dx++) {
    const s = ssd(dx, dy);
    if (s < bs) {
      bs = s;
      best = [dx, dy];
    }
  }
  const [bx, by] = best;
  const fx = (a, c, d) => {
    const den = a - 2 * c + d;
    return den > 1e-9 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - d)) / den)) : 0;
  };
  const vx = bx + fx(ssd(bx - 1, by), bs, ssd(bx + 1, by));
  const vy = by + fx(ssd(bx, by - 1), bs, ssd(bx, by + 1));
  return [vx, vy];
}

function gradE(Limg, mask) {
  let s = 0, n = 0;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const gx = Limg[i + 1] - Limg[i - 1], gy = Limg[i + W] - Limg[i - W];
      s += 0.25 * (gx * gx + gy * gy);
      n++;
    }
  return n ? s / n : 0;
}
function erode(m, r) {
  const inv = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) inv[i] = m[i] ? 0 : 1;
  const d = dilate(inv, W, H, r);
  const o = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) o[i] = d[i] ? 0 : 1;
  return o;
}

const res = {};
for (const q of seqs) res[q.name] = { box: Object.fromEntries(boxNames.map((n) => [n, { band: 0, j32: 0, j48: 0, flk: 0, mc32: 0, mce: 0, mcn: 0, eg: 0 }])), texLake: [], texSolid: [], halo: { all: 0, band: 0, px: 0 }, perFrame: [] };
let prevRefL = null;
const tmp = [0, 0, 0];
const motions = [];
for (let k = k0; k < N; k += stride) {
  const m = M.mask(k);
  const { band, lake, solid, hero } = bandFromMask(m, W, H, 3);
  // texture masks (from this frame's mask)
  const lakeI = erode(lake, 4), solidI = erode(solid, 4);
  const bandD = dilate(band, W, H, 2);
  for (let i = 0; i < lakeI.length; i++) {
    if (hero[i] || bandD[i]) {
      lakeI[i] = 0;
      solidI[i] = 0;
    }
    if (boxOf[i] < 0) solidI[i] = 0;
  }
  // motion per box from the reference variant
  const refF = ref.s.frame(k), refP = ref.s.frame(k - 1);
  const RL = lumaImg(refF), RP = lumaImg(refP);
  const v = {};
  for (const n of boxNames) v[n] = register(RP, RL, boxes[n]);
  motions.push({ k, v });
  const GTF = gtName ? seqs.find((q) => q.name === gtName).s.frame(k) : null;
  for (const q of seqs) {
    const r = res[q.name];
    const F = q.s.frame(k), P = q.s.frame(k - 1);
    const pf = { k };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!band[i]) continue;
        const bi = boxOf[i];
        if (bi < 0) continue;
        const bx = r.box[boxNames[bi]];
        const p = i * 4;
        const d = Math.max(Math.abs(F[p] - P[p]), Math.abs(F[p + 1] - P[p + 1]), Math.abs(F[p + 2] - P[p + 2]));
        bx.band++;
        if (d > 32) bx.j32++;
        if (d > 48) bx.j48++;
        bx.flk += d;
        if (GTF) bx.eg += Math.max(Math.abs(F[p] - GTF[p]), Math.abs(F[p + 1] - GTF[p + 1]), Math.abs(F[p + 2] - GTF[p + 2]));
        const [vx, vy] = v[boxNames[bi]];
        const sxp = x - vx, syp = y - vy;
        if (sxp >= 1 && sxp < W - 2 && syp >= 1 && syp < H - 2) {
          sampleRGB(P, sxp, syp, tmp);
          const e = Math.max(Math.abs(F[p] - tmp[0]), Math.abs(F[p + 1] - tmp[1]), Math.abs(F[p + 2] - tmp[2]));
          bx.mcn++;
          bx.mce += e;
          if (e > 32) bx.mc32++;
        }
      }
    const FL = q === ref ? RL : lumaImg(F);
    r.texLake.push(gradE(FL, lakeI));
    r.texSolid.push(gradE(FL, solidI));
    if (q !== ref) {
      // halos vs the reference's 3x3 range
      let all = 0, inBand = 0;
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x, p = i * 4;
          let out = false;
          for (let c = 0; c < 3 && !out; c++) {
            let mn = 255, mx = 0;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const vv = refF[((y + dy) * W + x + dx) * 4 + c];
                if (vv < mn) mn = vv;
                if (vv > mx) mx = vv;
              }
            if (F[p + c] > mx + 4 || F[p + c] < mn - 4) out = true;
          }
          if (out) {
            all++;
            if (band[i]) inBand++;
          }
        }
      r.halo.all += all;
      r.halo.band += inBand;
      r.halo.px += (W - 2) * (H - 2);
      pf.halo = all;
    }
    r.perFrame.push(pf);
  }
}
const summary = {};
for (const q of seqs) {
  const r = res[q.name];
  const s = { box: {}, tot: { band: 0, j32: 0, j48: 0, mc32: 0, mcn: 0, mce: 0, flk: 0, eg: 0 } };
  for (const n of boxNames) {
    const b = r.box[n];
    s.box[n] = { band: b.band, j32: +((1000 * b.j32) / Math.max(1, b.band)).toFixed(2), j48: +((1000 * b.j48) / Math.max(1, b.band)).toFixed(2), flk: +(b.flk / Math.max(1, b.band)).toFixed(3), mc32: +((1000 * b.mc32) / Math.max(1, b.mcn)).toFixed(2), mce: +(b.mce / Math.max(1, b.mcn)).toFixed(3), eg: +(b.eg / Math.max(1, b.band)).toFixed(3) };
    for (const k of ["band", "j32", "j48", "mc32", "mcn", "mce", "flk", "eg"]) s.tot[k] += b[k];
  }
  const t = s.tot;
  s.tot = { band: t.band, j32: +((1000 * t.j32) / t.band).toFixed(2), j48: +((1000 * t.j48) / t.band).toFixed(2), flk: +(t.flk / t.band).toFixed(3), mc32: +((1000 * t.mc32) / t.mcn).toFixed(2), mce: +(t.mce / t.mcn).toFixed(3), eg: +(t.eg / t.band).toFixed(3) };
  const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  s.texLake = +mean(r.texLake).toFixed(3);
  s.texSolid = +mean(r.texSolid).toFixed(3);
  if (q !== ref) s.halo = { all: r.halo.all, band: r.halo.band, perMpx: +((1e6 * r.halo.all) / Math.max(1, r.halo.px)).toFixed(2) };
  summary[q.name] = s;
}
const refS = summary[ref.name];
for (const q of seqs) {
  const s = summary[q.name];
  s.texLakeRatio = +(s.texLake / refS.texLake).toFixed(4);
  s.texSolidRatio = +(s.texSolid / refS.texSolid).toFixed(4);
}
// motion statistics (px / frame) per box
const ms = {};
for (const n of boxNames) {
  const sp = motions.map((m) => Math.hypot(m.v[n][0], m.v[n][1]));
  sp.sort((a, b) => a - b);
  ms[n] = { med: +sp[sp.length >> 1].toFixed(2), p90: +sp[Math.floor(sp.length * 0.9)].toFixed(2), max: +sp[sp.length - 1].toFixed(2) };
}
const outO = { frames: N - k0, ref: ref.name, boxes, motion: ms, summary };
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ ...outO, motions, perFrame: Object.fromEntries(seqs.map((q) => [q.name, res[q.name].perFrame])), tex: Object.fromEntries(seqs.map((q) => [q.name, { lake: res[q.name].texLake, solid: res[q.name].texSolid }])) }));
// table
const names = seqs.map((q) => q.name);
console.log(`frames ${N - k0}, ref ${ref.name}; motion px/frame (med / p90): ` + boxNames.map((n) => `${n} ${ms[n].med}/${ms[n].p90}`).join("  "));
console.log("metric".padEnd(10) + names.map((n) => n.padStart(14)).join(""));
for (const n of [...boxNames, "tot"]) {
  for (const key of gtName ? ["j32", "j48", "mc32", "mce", "flk", "eg"] : ["j32", "j48", "mc32", "mce", "flk"]) {
    const row = names.map((nm) => {
      const v = n === "tot" ? summary[nm].tot[key] : summary[nm].box[n][key];
      const r0 = n === "tot" ? refS.tot[key] : refS.box[n][key];
      const pct = r0 > 0 ? ` ${((100 * (v - r0)) / r0).toFixed(0)}%` : "";
      return (String(v) + (nm === ref.name ? "" : pct)).padStart(14);
    });
    console.log(`${n}.${key}`.padEnd(10) + row.join(""));
  }
}
console.log("texLake".padEnd(10) + names.map((nm) => `${summary[nm].texLake} (${summary[nm].texLakeRatio})`.padStart(14)).join(""));
console.log("texSolid".padEnd(10) + names.map((nm) => `${summary[nm].texSolid} (${summary[nm].texSolidRatio})`.padStart(14)).join(""));
console.log("halo/Mpx".padEnd(10) + names.map((nm) => String(summary[nm].halo ? `${summary[nm].halo.perMpx} b${summary[nm].halo.band}` : "-").padStart(14)).join(""));
