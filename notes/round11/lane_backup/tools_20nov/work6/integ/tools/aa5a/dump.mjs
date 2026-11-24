// node dump.mjs SEQDIR k OUT.png [x0,y0,x1,y1] [zoom] [mask]
import { loadSeq, png, bandFromMask } from "./lib.mjs";
const [dir, k, out, crop, zoom, wantMask] = process.argv.slice(2);
const s = loadSeq(dir);
let f = s.frame(+k);
if (wantMask) {
  const m = s.mask(+k);
  const { band, hero } = bandFromMask(m, s.W, s.H, 3);
  f = new Uint8Array(f);
  for (let i = 0; i < m.length; i++) {
    if (m[i] & 1) { f[i * 4] = f[i * 4] * 0.5; f[i * 4 + 1] = f[i * 4 + 1] * 0.5 + 60; }
    if (band[i]) { f[i * 4] = 255; f[i * 4 + 1] = 0; f[i * 4 + 2] = 255; }
    if (hero[i]) { f[i * 4 + 2] = 255; }
  }
}
png(f, s.W, s.H, out, { crop: crop && crop !== "-" ? crop.split(",").map(Number) : null, zoom: +(zoom || 1) });
console.log(s.meta.W, s.meta.H, s.y0, s.H, JSON.stringify(s.meta.info[+k]).slice(0, 300));
