// extra loss damage of the TAA build: per px max-channel |def_L1 - def_L0| minus |lk0_L1 - lk0_L0|; counts, signed (darker / brighter
// vs the no-loss frame), bounding rows, and a png of the extra (x4) for frame k
import fs from "node:fs";
import { png } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const W = 1440, H = 766, D = "g10/ctxstep/";
for (const k of [0, 1, 2, 3]) {
  const r = (n) => fs.readFileSync(`${D}${n}_f${k}.rgba`);
  const a1 = r("a7_def_L1"), a0 = r("a7_def_L0"), b1 = r("a7_lktaa0_L1"), b0 = r("a7_lktaa0_L0");
  let n16 = 0, dark = 0, n32 = 0; const img = Buffer.alloc(W * H * 4); const rows = new Map();
  for (let i = 0; i < W * H; i++) {
    let ea = 0, eb = 0, sa = 0;
    for (let c = 0; c < 3; c++) { const d = a1[i * 4 + c] - a0[i * 4 + c]; if (Math.abs(d) > ea) { ea = Math.abs(d); sa = d; } eb = Math.max(eb, Math.abs(b1[i * 4 + c] - b0[i * 4 + c])); }
    const ex = ea - eb;
    if (ex > 16) { n16++; if (sa < 0) dark++; const y = H - 1 - Math.floor(i / W); rows.set(y >> 5, (rows.get(y >> 5) || 0) + 1); }
    if (ex > 32) n32++;
    const v = Math.max(0, Math.min(255, ex * 4)); const o = ((H - 1 - Math.floor(i / W)) * W + (i % W)) * 4;
    img[o] = v; img[o + 1] = v; img[o + 2] = v; img[o + 3] = 255;
  }
  console.log(JSON.stringify({ frame: k, extraGt16: n16, ofWhichDarker: dark, extraGt32: n32, rows32: [...rows.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6).map(([r, c]) => [r * 32, c]) }));
  if (k === 0) png(img, W, H, D + "extra_taa_f0_x4.png");
}
