// Judge (artifacts) per-case analysis: base (with masks) vs lane vs off (lane ?lktaa=0), frame by frame.
//   node jana.mjs --base DIR --lane DIR [--off DIR] [--out JSON] [--list N] [--k0 --k1]
// Per frame: TAA state; |lane-base| > 4 lv split by region (band / lake / solid / sky / hero); |lane-off| > 4 in / out of
// the band; G4: lane px > 4 lv outside the 3x3 range of off (and of base), band / not, max excess, list of the worst;
// G3: luma gradient energy (dx^2 + dy^2) of lake interior / bright solid (snow, ice) / dark solid (rock), lane / base;
// G5: sky rows (above the first lake row - 4), hero mask, region-boundary pixels of aaIn (from the lane's uniforms).
import fs from "node:fs";
import { loadSeq, bandFromMask, dilate } from "../../../aa3/tools/lib.mjs";
const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].slice(2)] = argv[i + 1];
const B = loadSeq(opt.base), L = loadSeq(opt.lane), O = opt.off ? loadSeq(opt.off) : null;
const W = B.W, H = B.H, y0 = B.y0;
if (L.W !== W || L.H !== H || (O && (O.W !== W || O.H !== H))) throw new Error("size mismatch");
const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), B.n, L.n, O ? O.n : 1e9);
const LIST = +(opt.list || 30);
const lum = (f, p) => 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
const erode = (m, r) => { const inv = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) inv[i] = m[i] ? 0 : 1; const d = dilate(inv, W, H, r); const o = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) o[i] = d[i] ? 0 : 1; return o; };
function g4(fa, fb, x, y) {
  const p = (y * W + x) * 4;
  let ex = 0, sg = 0;
  for (let c = 0; c < 3; c++) {
    let mn = 255, mx = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fb[((y + dy) * W + x + dx) * 4 + c]; if (v < mn) mn = v; if (v > mx) mx = v; }
    const v = fa[p + c];
    if (v > mx + 4 && v - mx > ex) { ex = v - mx; sg = 1; }
    if (v < mn - 4 && mn - v > ex) { ex = mn - v; sg = -1; }
  }
  return ex * sg;
}
function aaInMask(info) {
  // gl_FragCoord (bottom-up, +0.5) of the main target; only when main == drawing buffer
  if (!info.aa || info.main[0] !== info.W || info.main[1] !== info.H) return null;
  const P = info.aa.plane, E = info.aa.exc;
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const gy = info.H - (y + y0) - 0.5;
    for (let x = 0; x < W; x++) {
      const gx = x + 0.5;
      const pl = gx * P[0] + gy * P[1] + P[2];
      const e0 = gx * E[0] + gy * E[1] + E[2], e1 = gx * E[3] + gy * E[4] + E[5], e2 = gx * E[6] + gy * E[7] + E[8];
      m[y * W + x] = pl < 0 && !(e0 >= 0 && e1 >= 0 && e2 >= 0) ? 1 : 0;
    }
  }
  return m;
}
const rows = [];
const worstOff = [], worstBase = [];
const tex = { lake: [0, 0], bright: [0, 0], dark: [0, 0] };
const g5 = { sky: [0, 0, 0], hero: [0, 0, 0], bndIn: [0, 0], bndOut: [0, 0], inner: [0, 0], excBox: 0 };
for (let k = k0; k < k1; k++) {
  const m = B.mask(k);
  const { band, lake, solid, hero } = bandFromMask(m, W, H, 3);
  const fb = B.frame(k), fl = L.frame(k), fo = O ? O.frame(k) : null;
  const info = L.meta.info[k];
  let top = H;
  for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] & 1) { top = y; break; }
  const lakeI = erode(lake, 3), solidI = erode(solid, 3);
  const r = { k, i: info.i, taa: info.taa ? info.taa.weight : null, ev: info.ev, act: info.act, d: { band: 0, lake: 0, solid: 0, sky: 0, hero: 0 }, off: { band: 0, out: 0, max: 0 }, g4off: [0, 0, 0], g4base: [0, 0, 0] };
  // region boundary (aaIn) of the lane
  const reg = aaInMask(info);
  let regB = null;
  if (reg) {
    regB = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (reg[i] !== reg[i - 1] || reg[i] !== reg[i + 1] || reg[i] !== reg[i - W] || reg[i] !== reg[i + W]) regB[i] = 1; }
  }
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, p = i * 4;
      const d = Math.max(Math.abs(fl[p] - fb[p]), Math.abs(fl[p + 1] - fb[p + 1]), Math.abs(fl[p + 2] - fb[p + 2]));
      const reg5 = hero[i] ? "hero" : band[i] ? "band" : y < top - 4 ? "sky" : lake[i] ? "lake" : "solid";
      if (d > 4) r.d[reg5]++;
      if (reg5 === "sky") { g5.sky[0] += d; g5.sky[1]++; g5.sky[2] = Math.max(g5.sky[2], d); }
      if (reg5 === "hero") { g5.hero[0] += d; g5.hero[1]++; g5.hero[2] = Math.max(g5.hero[2], d); }
      if (regB && !hero[i]) {
        if (regB[i]) { if (band[i]) { g5.bndIn[0] += d; g5.bndIn[1]++; } else { g5.bndOut[0] += d; g5.bndOut[1]++; } }
      }
      if (fo) {
        const dd = Math.max(Math.abs(fl[p] - fo[p]), Math.abs(fl[p + 1] - fo[p + 1]), Math.abs(fl[p + 2] - fo[p + 2]));
        if (dd > 4) { if (band[i]) r.off.band++; else r.off.out++; }
        r.off.max = Math.max(r.off.max, dd);
        const e = g4(fl, fo, x, y);
        if (e) { r.g4off[0]++; if (band[i]) r.g4off[1]++; r.g4off[2] = Math.max(r.g4off[2], Math.abs(e)); worstOff.push({ k, x, y: y + y0, e, band: band[i], hero: hero[i], l: [fl[p], fl[p + 1], fl[p + 2]], o: [fo[p], fo[p + 1], fo[p + 2]] }); }
      }
      if (d > 4) {
        const e = g4(fl, fb, x, y);
        if (e) { r.g4base[0]++; if (band[i]) r.g4base[1]++; r.g4base[2] = Math.max(r.g4base[2], Math.abs(e)); if (worstBase.length < 200000) worstBase.push({ k, x, y: y + y0, e, band: band[i], hero: hero[i], lake: lake[i] }); }
      }
      // G3 texture (horizontal + vertical luma gradient energy)
      if (y >= top) {
        const cls = lakeI[i] && !hero[i] ? "lake" : solidI[i] && !hero[i] ? (lum(fb, p) > 150 ? "bright" : "dark") : null;
        if (cls) {
          const gl = (f) => { const a = lum(f, p), dx = lum(f, p + 4) - a, dy = lum(f, p + W * 4) - a; return dx * dx + dy * dy; };
          tex[cls][0] += gl(fl); tex[cls][1] += gl(fb);
        }
      }
    }
  rows.push(r);
}
const n = rows.length;
const res = {
  frames: n, W, H, y0,
  tex: Object.fromEntries(Object.entries(tex).map(([k, v]) => [k, +(v[0] / Math.max(1e-9, v[1])).toFixed(4)])),
  g5: { skyMean: +(g5.sky[0] / Math.max(1, g5.sky[1])).toFixed(4), skyMax: g5.sky[2], heroMean: +(g5.hero[0] / Math.max(1, g5.hero[1])).toFixed(4), heroMax: g5.hero[2], regionBoundaryBandMean: +(g5.bndIn[0] / Math.max(1, g5.bndIn[1])).toFixed(3), regionBoundaryBandPx: g5.bndIn[1], regionBoundaryOtherMean: +(g5.bndOut[0] / Math.max(1, g5.bndOut[1])).toFixed(3), regionBoundaryOtherPx: g5.bndOut[1] },
  g4off: { px: rows.reduce((a, r) => a + r.g4off[0], 0), band: rows.reduce((a, r) => a + r.g4off[1], 0), max: Math.max(0, ...rows.map((r) => r.g4off[2])), perMpxFrame: +((1e6 * rows.reduce((a, r) => a + r.g4off[0], 0)) / (W * H * n)).toFixed(3) },
  g4base: { px: rows.reduce((a, r) => a + r.g4base[0], 0), band: rows.reduce((a, r) => a + r.g4base[1], 0), max: Math.max(0, ...rows.map((r) => r.g4base[2])) },
  offOutsideBandPx: rows.reduce((a, r) => a + r.off.out, 0),
  rows: rows.map((r) => `${r.k}(i${r.i}) taa ${r.taa} ${r.ev || ""}${r.act ? JSON.stringify(r.act) : ""} | l-b>4 band ${r.d.band} lake ${r.d.lake} solid ${r.d.solid} sky ${r.d.sky} hero ${r.d.hero} | l-o>4 band ${r.off.band} out ${r.off.out} max ${r.off.max} | g4off ${r.g4off.join("/")} g4base ${r.g4base.join("/")}`),
  worstOff: worstOff.sort((a, b) => Math.abs(b.e) - Math.abs(a.e)).slice(0, LIST),
  worstBaseNonLake: worstBase.filter((w) => !w.lake && !w.hero).sort((a, b) => Math.abs(b.e) - Math.abs(a.e)).slice(0, LIST),
};
const s = JSON.stringify(res, null, 1);
if (opt.out) fs.writeFileSync(opt.out, s);
console.log(JSON.stringify({ frames: res.frames, tex: res.tex, g5: res.g5, g4off: res.g4off, g4base: res.g4base, offOutsideBandPx: res.offOutsideBandPx }, null, 1));
