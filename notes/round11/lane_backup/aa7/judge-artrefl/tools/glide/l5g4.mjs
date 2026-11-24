// prejudge-glide L5: G4 of A vs the unblurred resolve R (same path / frames): A px more than 4 lv outside R's 3x3 per-channel
// range, on the band (BASE mask +-3 px, scaled) and elsewhere; by sign and excess; per Mpx-frame.  node l5g4.mjs MASKSEQ A R [--k1 N]
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2);
const M = argv[0] === "none" ? null : loadSeq(argv[0]), A = loadSeq(argv[1]), R = loadSeq(argv[2]);
const k1 = Math.min(argv.includes("--k1") ? +argv[argv.indexOf("--k1") + 1] : 1e9, M ? M.n : 1e9, A.n, R.n);
const W = A.W, H = A.H, sc = W / 1440;
let px = 0, nb = 0, all = 0, band = 0, dark = 0, bright = 0, mx = 0;
const hist = new Array(6).fill(0), hot = [];
for (let k = 1; k < k1; k++) {
  const b = M ? bandFromMask(M.mask(k), W, H, Math.round(3 * sc)).band : new Uint8Array(W * H);
  const fa = A.frame(k), fr = R.frame(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, p = i * 4;
    px++; if (b[i]) nb++;
    let ex = 0, sg = 0;
    for (let c = 0; c < 3; c++) {
      let mn = 255, mxv = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fr[((y + dy) * W + x + dx) * 4 + c]; if (v < mn) mn = v; if (v > mxv) mxv = v; }
      const v = fa[p + c];
      if (v > mxv + 4 && v - mxv > ex) { ex = v - mxv; sg = 1; }
      if (v < mn - 4 && mn - v > ex) { ex = mn - v; sg = -1; }
    }
    if (!ex) continue;
    all++; if (b[i]) band++; if (sg < 0) dark++; else bright++; mx = Math.max(mx, ex);
    hist[Math.min(5, Math.floor((ex - 4) / 4))]++;
    if (ex >= 12 && hot.length < 30) hot.push(`k${k}(${x},${y + A.y0})${sg * ex}${b[i] ? "b" : ""}`);
  }
}
console.log(`${argv[1].split("/").slice(-2).join("/")} vs ${argv[2].split("/").slice(-2).join("/")}: frames ${k1 - 1}, W ${W}: G4 ${all} px = ${(1e6 * all / px).toFixed(2)} per Mpx-frame; on band ${band} (${(1e6 * band / Math.max(1, nb)).toFixed(2)} per M band px); dark ${dark} bright ${bright}; max excess ${mx}; excess hist 4-8,8-12,..,>24: ${hist.join(",")}`);
console.log("  hot >= 12: " + hot.join(" "));
