// dump frame k of SEQ (full-frame coords crop) to PNG: node fr.mjs SEQ K OUT [x0,y0,x1,y1] [zoom]
import { loadSeq, png } from "./lib.mjs";
const [d, k, out, crop, z] = process.argv.slice(2); const s = loadSeq(d);
let c = crop ? crop.split(",").map(Number) : [0, s.y0, s.W, s.y0 + s.H]; c = [c[0], c[1] - s.y0, c[2], c[3] - s.y0];
png(s.frame(+k), s.W, s.H, out, { crop: c, zoom: +(z || 1) });
