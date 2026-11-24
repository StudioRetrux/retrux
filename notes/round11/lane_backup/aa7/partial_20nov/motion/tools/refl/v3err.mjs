// prejudge-refl: where does X move AWAY from the GT relative to REF (luma, 8-bit)?  Lake px (mask bit0 or the +-r band), hero
// (dilated) excluded. Away = |X-GT| - |R-GT| > thr AND |X-R| > thr. Toward = |R-GT| - |X-GT| > thr AND |X-R| > thr.
// Without a GT (--gt none): changed = |X-R| > thr (signed by X-R).
// Per class (darker / brighter than REF): 8-connected components per frame, linked over frames (bbox within 3 px, k-1) -> events.
//   node v3err.mjs --mask M --gt G|none --x X --ref R [--thr 20] [--r 3] [--k0 0] [--k1 N] [--top 15] [--json F] [--minpx 6]
import fs from "node:fs";
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
const thr = +(opt.thr || 20), r = +(opt.r || 3), minpx = +(opt.minpx || 6);
const X = loadSeq(opt.x), M = opt.mask === "none" ? { W: X.W, H: X.H, y0: X.y0, n: X.n, mask: () => new Uint8Array(X.W * X.H).fill(1) } : loadSeq(opt.mask), R = loadSeq(opt.ref), G = opt.gt && opt.gt !== "none" ? loadSeq(opt.gt) : null;
const W = M.W, H = M.H, y0 = M.y0;
const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), M.n, X.n, R.n, G ? G.n : 1e9);
const lum = (f, q) => 0.2126 * f[q] + 0.7152 * f[q + 1] + 0.0722 * f[q + 2];
const cls = { dark: { px: 0, ev: [], open: [] }, bright: { px: 0, ev: [], open: [] } };
let toward = 0, away = 0, changed = 0, lakepx = 0;
for (let k = k0; k < k1; k++) {
  const { band, lake, hero } = bandFromMask(M.mask(k), W, H, r);
  const fx = X.frame(k), fr = R.frame(k), fg = G ? G.frame(k) : null;
  const lab = { dark: new Uint8Array(W * H), bright: new Uint8Array(W * H) };
  const val = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!(lake[i] || band[i]) || hero[i]) continue;
    lakepx++;
    const qx = ((y + y0 - X.y0) * X.W + x) * 4, qr = ((y + y0 - R.y0) * R.W + x) * 4;
    const lx = lum(fx, qx), lr = lum(fr, qr), d = lx - lr;
    if (Math.abs(d) <= thr) continue;
    changed++;
    let hit = true;
    if (fg) {
      const lg = lum(fg, ((y + y0 - G.y0) * G.W + x) * 4);
      const ex = Math.abs(lx - lg), er = Math.abs(lr - lg);
      if (er - ex > thr) toward++;
      if (ex - er > thr) away++; else hit = false;
    }
    if (!hit) continue;
    const c = d < 0 ? "dark" : "bright"; lab[c][i] = 1; val[i] = d; cls[c].px++;
  }
  for (const c of ["dark", "bright"]) {
    const fl = lab[c], seen = new Uint8Array(W * H), comps = [], st = [];
    for (let i = 0; i < fl.length; i++) {
      if (!fl[i] || seen[i]) continue;
      const cc = { n: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1, dsum: 0, dmax: 0 }; seen[i] = 1; st.push(i);
      while (st.length) {
        const j = st.pop(), x = j % W, y = (j / W) | 0;
        cc.n++; cc.x0 = Math.min(cc.x0, x); cc.x1 = Math.max(cc.x1, x); cc.y0 = Math.min(cc.y0, y + y0); cc.y1 = Math.max(cc.y1, y + y0);
        cc.dsum += val[j]; cc.dmax = Math.max(cc.dmax, Math.abs(val[j]));
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const jj = yy * W + xx; if (fl[jj] && !seen[jj]) { seen[jj] = 1; st.push(jj); }
        }
      }
      comps.push(cc);
    }
    const C = cls[c], nextOpen = [];
    for (const cc of comps) {
      let e = C.open.find((o) => o.x0 - 3 <= cc.x1 && cc.x0 <= o.x1 + 3 && o.y0 - 3 <= cc.y1 && cc.y0 <= o.y1 + 3);
      if (!e) { e = { k0: k, k1: k, x0: cc.x0, y0: cc.y0, x1: cc.x1, y1: cc.y1, n: 0, nmax: 0, dmax: 0, dsum: 0, nf: 0 }; C.ev.push(e); }
      if (e.k1 !== k) e.nf++; else if (e.nf === 0) e.nf = 1;
      e.k1 = k; e.n += cc.n; e.nmax = Math.max(e.nmax, cc.n); e.dmax = Math.max(e.dmax, cc.dmax); e.dsum += cc.dsum;
      e.x0 = Math.min(e.x0, cc.x0); e.x1 = Math.max(e.x1, cc.x1); e.y0 = Math.min(e.y0, cc.y0); e.y1 = Math.max(e.y1, cc.y1);
      if (!nextOpen.includes(e)) nextOpen.push(e);
    }
    C.open = nextOpen;
  }
}
const out = { frames: k1 - k0, thr, lakepx, changed, toward, away };
console.log(`frames ${k1 - k0} thr ${thr}: lake+band px-frames ${lakepx}; |X-R|>thr ${changed}` + (G ? `; toward GT ${toward}, AWAY from GT ${away}` : ""));
for (const c of ["dark", "bright"]) {
  const C = cls[c];
  const big = C.ev.filter((e) => e.n >= minpx).sort((a, b) => b.n - a.n);
  out[c] = { px: C.px, events: big.length, list: big.map((e) => ({ ...e, dmean: +(e.dsum / e.n).toFixed(1) })) };
  console.log(`-- ${c}${G ? " (away from GT)" : ""}: px ${C.px}, events >= ${minpx} px: ${big.length}`);
  for (const e of big.slice(0, +(opt.top || 15)))
    console.log(`  k${e.k0}-${e.k1} (${e.nf}f) x${e.x0}-${e.x1} y${e.y0}-${e.y1} n${e.n} nmax${e.nmax} dmean${(e.dsum / e.n).toFixed(0)} dmax${Math.round(e.dmax)}`);
}
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out));
