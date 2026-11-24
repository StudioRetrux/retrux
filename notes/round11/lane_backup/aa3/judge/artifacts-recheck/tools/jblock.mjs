// A-4 recheck: the pale block on the reverse sweep. Per frame in a window: sum of positive luma above GT (X - GT > 0), and the
// count of px more than 8 lv above GT, for each sequence.  node jblock.mjs --win x0,y0,x1,y1 --k0 --k1 GT SEQ...
import { loadSeq } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(argv[i]); }
const [x0, y0, x1, y1] = opt.win.split(",").map(Number);
const G = loadSeq(seqs[0]), S = seqs.slice(1).map((d) => loadSeq(d));
const lum = (f, p) => 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
const tot = S.map(() => [0, 0]);
for (let k = +opt.k0; k <= +opt.k1; k++) {
  const fg = G.frame(k); const row = [`k${k}`];
  S.forEach((s, j) => {
    const f = s.frame(k); let pos = 0, n8 = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = ((y - s.y0) * s.W + x) * 4, pg = ((y - G.y0) * G.W + x) * 4; const d = lum(f, p) - lum(fg, pg); if (d > 0) pos += d; if (d > 8) n8++; }
    row.push(`${seqs[j + 1].split("/").slice(-1)[0]} pos ${pos.toFixed(0)} n8 ${n8}`); tot[j][0] += pos; tot[j][1] += n8;
  });
  if (opt.v) console.log(row.join(" | "));
}
console.log("TOTAL " + S.map((s, j) => `${seqs[j + 1].split("/").slice(-2).join("/")}: pos ${tot[j][0].toFixed(0)} n8 ${tot[j][1]}`).join(" | "));
