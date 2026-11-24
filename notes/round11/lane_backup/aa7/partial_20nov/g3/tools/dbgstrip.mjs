// g3: final-image crops of dbgcap dirs as a strip: rows = ks, cols = dirs.  node dbgstrip.mjs --ks 89,90 --crop x0,y0,x1,y1 --zoom 4 --out F.png DIR...
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
import { png } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const dirs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else dirs.push(argv[i]); }
const ks = opt.ks.split(",").map(Number); const [x0, y0, x1, y1] = opt.crop.split(",").map(Number);
const cw = x1 - x0, ch = y1 - y0, gap = 2;
const W = dirs.length * cw + (dirs.length - 1) * gap, H = ks.length * ch + (ks.length - 1) * gap;
const img = new Uint8Array(W * H * 4).fill(255);
ks.forEach((k, r) => dirs.forEach((d, c) => {
  const meta = JSON.parse(fs.readFileSync(path.join(d, "dbg.json"), "utf8"));
  const [mx0, my0] = meta.crop; const fr = meta.frames.find((f) => f.k === k); const [fw] = fr.dims.final;
  const fin = zlib.inflateSync(fs.readFileSync(path.join(d, `k${String(k).padStart(4, "0")}_final.bin`)));
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const s = ((y + y0 - my0) * fw + (x + x0 - mx0)) * 4, o = ((r * (ch + gap) + y) * W + c * (cw + gap) + x) * 4;
    img[o] = fin[s]; img[o + 1] = fin[s + 1]; img[o + 2] = fin[s + 2]; img[o + 3] = 255;
  }
}));
png(img, W, H, opt.out, { zoom: +(opt.zoom || 4) });
console.log("wrote", opt.out);
