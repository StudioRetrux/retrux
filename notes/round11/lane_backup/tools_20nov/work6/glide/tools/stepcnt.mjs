// prejudge-glide: per frame, band px (BASE mask +-3) whose luma changed > 4 / 8 / 16 lv from the previous frame, per variant,
// and the gradient energy; frames k0..k1.   node stepcnt.mjs DIR a6,g0,base k0 k1 [--m base]
import path from "node:path";
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2);
const [dir, varsA, k0A, k1A] = argv;
const mName = argv.includes("--m") ? argv[argv.indexOf("--m") + 1] : "base";
const vars = varsA.split(","), S = vars.map((v) => loadSeq(path.join(dir, v))), M = loadSeq(path.join(dir, mName));
const W = M.W, H = M.H, sc = W / 1440;
const lum = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
console.log(`k    i  | ${vars.map((v) => `${v}: >4 >8 >16  grad2`).join(" | ")}   (band px)`);
for (let k = +k0A; k <= +k1A; k++) {
  const { band } = bandFromMask(M.mask(k), W, H, Math.round(3 * sc));
  let nb = 0; const r = vars.map(() => [0, 0, 0, 0]);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; if (!band[i]) continue; nb++;
    S.forEach((s, j) => {
      const f = s.frame(k), p = s.frame(k - 1);
      const d = Math.abs(lum(f, i) - lum(p, i));
      if (d > 4) r[j][0]++; if (d > 8) r[j][1]++; if (d > 16) r[j][2]++;
      const gx = (lum(f, i + 1) - lum(f, i - 1)) / 2, gy = (lum(f, i + W) - lum(f, i - W)) / 2; r[j][3] += gx * gx + gy * gy;
    });
  }
  const inf = S[0].meta.info[k];
  console.log(`${String(k).padStart(3)} ${String(inf.i).padStart(4)} ${(inf.ev || "").padEnd(4)}| ${r.map((a) => `${String(a[0]).padStart(6)} ${String(a[1]).padStart(5)} ${String(a[2]).padStart(4)} ${(a[3] / nb).toFixed(1).padStart(6)}`).join(" | ")}   (${nb})  taa ${S.map((s) => { const t = s.meta.info[k].taa; return t ? t.weight + "/" + t.still : "-"; }).join(" ")}`);
}
