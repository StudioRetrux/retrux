// AA8 polish: crops of the stepped context-loss frames (raw bottom-up RGBA 1440x766) side by side, zoomed.
//   node ctxstrip.mjs OUT.png x0,y0,x1,y1 zoom k LABEL=prefix ...   (prefix + "_f<k>.rgba")
import fs from "node:fs";
import { png, cropRGBA } from "./lib.mjs";
const [out, box, zs, ks, ...ls] = process.argv.slice(2);
const [x0, y0, x1, y1] = box.split(",").map(Number), z = +zs, W = 1440, H = 766;
const tiles = ls.map((s) => {
  const [, p] = s.split("=");
  const b = fs.readFileSync(`${p}_f${ks}.rgba`); const f = Buffer.alloc(b.length);
  for (let y = 0; y < H; y++) b.copy(f, y * W * 4, (H - 1 - y) * W * 4, (H - y) * W * 4);
  return cropRGBA(f, W, [x0, y0, x1, y1]);
});
const w = x1 - x0, h = y1 - y0, gap = 4, TW = w * ls.length + gap * (ls.length - 1);
const img = Buffer.alloc(TW * h * 4, 255);
tiles.forEach((t, j) => { for (let y = 0; y < h; y++) img.set(t.subarray(y * w * 4, (y + 1) * w * 4), (y * TW + j * (w + gap)) * 4); });
png(img, TW, h, out, { zoom: z });
console.log("wrote", out, ls.map((s) => s.split("=")[0]).join(" | "));
