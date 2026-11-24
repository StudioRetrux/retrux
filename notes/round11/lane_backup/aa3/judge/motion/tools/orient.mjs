// full crop of one frame with the six boxes outlined (yellow) and the band (mask) tinted
import { loadSeq, png, bandFromMask } from "./lib.mjs";
const [dir, maskDir, kS, out] = process.argv.slice(2); const k = +kS;
const s = loadSeq(dir), M = loadSeq(maskDir); const W = s.W, H = s.H, Y0 = s.y0;
const f = new Uint8Array(s.frame(k));
const { band, hero } = bandFromMask(M.mask(k), W, H, 3);
for (let i = 0; i < W * H; i++) { if (band[i]) { f[i * 4] = Math.min(255, f[i * 4] + 70); } if (hero[i]) { f[i * 4 + 1] = Math.min(255, f[i * 4 + 1] + 60); } }
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
for (const [x0, y0, x1, y1] of Object.values(BOXES)) { const put = (x, y) => { y -= Y0; if (x < 0 || x >= W || y < 0 || y >= H) return; const p = (y * W + x) * 4; f[p] = 255; f[p + 1] = 255; f[p + 2] = 0; }; for (let x = x0; x < x1; x++) { put(x, y0); put(x, y1 - 1); } for (let y = y0; y < y1; y++) { put(x0, y); put(x1 - 1, y); } }
png(f, W, H, out);
