// consecutive-frame change on the band (|f(k) - f(k-1)| > 4 count and mean) for base / lane / off, frames k0..k1 (handover / restart pops)
import { loadSeq, bandFromMask } from "../../../aa3/tools/lib.mjs";
const [bd, ld, od, a, b] = process.argv.slice(2);
const B = loadSeq(bd), L = loadSeq(ld), O = od && od !== "-" ? loadSeq(od) : null, W = B.W, H = B.H;
for (let k = Math.max(1, +a); k <= +b; k++) {
  const { band } = bandFromMask(B.mask(k), W, H, 3);
  const out = [];
  for (const S of [B, L, O]) {
    if (!S) continue;
    const f = S.frame(k), g = S.frame(k - 1);
    let n = 0, s = 0, c = 0;
    for (let i = 0; i < W * H; i++) { if (!band[i]) continue; const p = i * 4; const d = Math.max(Math.abs(f[p] - g[p]), Math.abs(f[p + 1] - g[p + 1]), Math.abs(f[p + 2] - g[p + 2])); c++; s += d; if (d > 4) n++; }
    out.push(`${n}/${(s / c).toFixed(2)}`);
  }
  const t = L.meta.info[k].taa;
  console.log(`k${k} taa w${t ? t.weight : "-"} still${t ? t.still : "-"} | base ${out[0]} lane ${out[1]}${out[2] ? " off " + out[2] : ""}`);
}
