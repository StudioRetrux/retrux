import { loadSeq, png } from "./lib.mjs";
const [dir, k, out] = process.argv.slice(2);
const s = loadSeq(dir);
png(s.frame(+k), s.W, s.H, out);
console.log(s.W, s.H, s.y0);
