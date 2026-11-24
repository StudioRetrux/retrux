// lane (or base) frame of engine A vs engine B, same deterministic pose: per-box diff stats
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const [dir, name, ea, eb] = process.argv.slice(2);
const get = (e) => { const m = JSON.parse(fs.readFileSync(path.join(dir, `${e}.json`), "utf8")).find((x) => x.name === name); const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `${e}_${name}.rgba.z`))); return { raw, W: m.shot.W, H: m.shot.H }; };
const A = get(ea), B = get(eb);
const W = A.W, H = A.H;
const boxes = { FS: [180, 600, 430, 720], RS: [940, 590, 1240, 655], FF: [60, 445, 420, 560], WR: [990, 650, 1215, 725], ALL: [0, 0, W, H] };
const out = {};
for (const [k, [x0, y0, x1, y1]] of Object.entries(boxes)) {
  let n = 0, o4 = 0, o16 = 0, mx = 0, sum = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = ((H - 1 - y) * W + x) * 4; // raw rows bottom-up
    let m = 0; for (let j = 0; j < 3; j++) m = Math.max(m, Math.abs(A.raw[i + j] - B.raw[i + j]));
    n++; sum += m; if (m > 4) o4++; if (m > 16) o16++; mx = Math.max(mx, m);
  }
  out[k] = { mean: +(sum / n).toFixed(3), over4: +(o4 / n * 100).toFixed(2) + "%", over16: +(o16 / n * 100).toFixed(3) + "%", max: mx };
}
console.log(`${name}: ${ea} vs ${eb}`, JSON.stringify(out));
