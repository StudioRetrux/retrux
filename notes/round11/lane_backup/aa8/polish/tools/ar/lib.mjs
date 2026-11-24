// AA3 analysis helpers (node, no deps): sequences written by cap.mjs, PNG output through ffmpeg.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

export const FFMPEG = "/opt/homebrew/bin/ffmpeg";

export function loadSeq(dir) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const W = meta.W, H = meta.y1 - meta.y0;
  const cache = new Map();
  const flip = (buf, bpp) => {
    // cap.mjs stores readPixels rows (bottom-up); return top-down
    const row = W * bpp;
    const o = new Uint8Array(buf.length);
    for (let y = 0; y < H; y++) o.set(buf.subarray((H - 1 - y) * row, (H - y) * row), y * row);
    return o;
  };
  const frame = (k) => {
    const key = "f" + k;
    if (cache.has(key)) return cache.get(key);
    const b = zlib.inflateSync(fs.readFileSync(path.join(dir, `f${String(k).padStart(4, "0")}.bin`)));
    const f = flip(new Uint8Array(b.buffer, b.byteOffset, b.length), 4);
    if (cache.size > 24) cache.delete(cache.keys().next().value);
    cache.set(key, f);
    return f;
  };
  const hasMask = fs.existsSync(path.join(dir, "m0000.bin"));
  const mask = (k) => {
    const b = zlib.inflateSync(fs.readFileSync(path.join(dir, `m${String(k).padStart(4, "0")}.bin`)));
    return flip(new Uint8Array(b.buffer, b.byteOffset, b.length), 1);
  };
  return { dir, meta, W, H, y0: meta.y0, n: meta.info.length, frame, mask, hasMask };
}

/** Writes an RGBA (top-down) image or a crop of it as PNG, optionally zoomed (nearest). */
export function png(rgba, W, H, file, { crop = null, zoom = 1 } = {}) {
  let x0 = 0, y0 = 0, x1 = W, y1 = H;
  if (crop) [x0, y0, x1, y1] = crop;
  const cw = x1 - x0, ch = y1 - y0;
  const o = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const s = ((y + y0) * W + x0) * 4;
    o.set(rgba.subarray(s, s + cw * 4), y * cw * 4);
  }
  const tmp = file + ".raw";
  fs.writeFileSync(tmp, o);
  const vf = zoom !== 1 ? ["-vf", `scale=${cw * zoom}:${ch * zoom}:flags=neighbor`] : [];
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${cw}x${ch}`, "-i", tmp, ...vf, file]);
  fs.unlinkSync(tmp);
}

/** Side-by-side / stacked composition of several equally sized RGBA crops (with a 2 px white gap). */
export function hstack(imgs, w, h, gap = 2) {
  const W = imgs.length * w + (imgs.length - 1) * gap;
  const o = new Uint8Array(W * h * 4).fill(255);
  imgs.forEach((im, i) => {
    for (let y = 0; y < h; y++) o.set(im.subarray(y * w * 4, (y + 1) * w * 4), (y * W + i * (w + gap)) * 4);
  });
  return { img: o, W, H: h };
}
export function vstack(imgs, w, h, gap = 2) {
  const H = imgs.length * h + (imgs.length - 1) * gap;
  const o = new Uint8Array(w * H * 4).fill(255);
  imgs.forEach((im, i) => o.set(im.subarray(0, w * h * 4), i * (h + gap) * w * 4));
  return { img: o, W: w, H };
}
export function cropRGBA(rgba, W, [x0, y0, x1, y1]) {
  const cw = x1 - x0, ch = y1 - y0;
  const o = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const s = ((y + y0) * W + x0) * 4;
    o.set(rgba.subarray(s, s + cw * 4), y * cw * 4);
  }
  return o;
}

export const luma8 = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Dilates a 0/1 mask (Uint8Array W x H) by r px (square). */
export function dilate(m, W, H, r) {
  const t = new Uint8Array(m.length);
  for (let y = 0; y < H; y++) {
    let run = -1e9;
    for (let x = 0; x < W; x++) if (m[y * W + x]) run = x;
    // two passes per row (left->right, right->left)
  }
  // separable: rows
  const a = new Uint8Array(m.length);
  for (let y = 0; y < H; y++) {
    let last = -1e9;
    for (let x = 0; x < W; x++) {
      if (m[y * W + x]) last = x;
      if (x - last <= r) a[y * W + x] = 1;
    }
    last = 1e9;
    for (let x = W - 1; x >= 0; x--) {
      if (m[y * W + x]) last = x;
      if (last - x <= r) a[y * W + x] = 1;
    }
  }
  for (let x = 0; x < W; x++) {
    let last = -1e9;
    for (let y = 0; y < H; y++) {
      if (a[y * W + x]) last = y;
      if (y - last <= r) t[y * W + x] = 1;
    }
    last = 1e9;
    for (let y = H - 1; y >= 0; y--) {
      if (a[y * W + x]) last = y;
      if (last - y <= r) t[y * W + x] = 1;
    }
  }
  return t;
}

/** The lake / surface boundary of a cap.mjs mask (bit0 lake, bit1 partial, bit2 hero): band of +-r px, hero (dilated) excluded. */
export function bandFromMask(m, W, H, r = 3) {
  const lake = new Uint8Array(m.length), solid = new Uint8Array(m.length), hero = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) {
    lake[i] = m[i] & 1 ? 1 : 0;
    solid[i] = m[i] & 3 ? 0 : 1;
    hero[i] = m[i] & 4 ? 1 : 0;
  }
  const edge = new Uint8Array(m.length);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      // a lake pixel next to a solid pixel (or vice versa), partial pixels count as the boundary itself
      if (m[i] & 2) edge[i] = 1;
      else if (lake[i] && (solid[i - 1] || solid[i + 1] || solid[i - W] || solid[i + W])) edge[i] = 1;
      else if (solid[i] && (lake[i - 1] || lake[i + 1] || lake[i - W] || lake[i + W])) edge[i] = 1;
    }
  const band = dilate(edge, W, H, r);
  const heroD = dilate(hero, W, H, 6);
  for (let i = 0; i < band.length; i++) if (heroD[i]) band[i] = 0;
  return { band, edge, lake, solid, hero: heroD };
}

export function median(a) {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[s.length >> 1] : NaN;
}
export const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
