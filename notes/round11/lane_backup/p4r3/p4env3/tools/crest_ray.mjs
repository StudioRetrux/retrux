// p4env G1: label the CLOUD_RANGE crest columns by what the rest plate camera sees just under the skyline, and find the
// far-only skyline (objects deeper than RANGE_DEPTH) behind the near ones. Raycasts the engine's own baked meshes
// (as decoded) through the engine's own plate camera (uPlateViewProjF), read-only.
//   LAB=http://localhost:5174 node crest_ray.mjs <out.json>
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const LAB = process.env.LAB || "http://localhost:5174";
const CREST = [
  0.476, 0.476, 0.4753, 0.4753, 0.4753, 0.4745, 0.476, 0.476, 0.4753, 0.476, 0.476, 0.4753, 0.4863, 0.4902, 0.4894, 0.487,
  0.4863, 0.487, 0.4949, 0.5035, 0.5035, 0.5067, 0.5059, 0.509, 0.5075, 0.5106, 0.5153, 0.5122, 0.5059, 0.5059, 0.5075, 0.509,
  0.5098, 0.509, 0.5075, 0.509, 0.509, 0.5067, 0.4988, 0.5043, 0.5082, 0.5098, 0.5075, 0.5059, 0.5067, 0.5067, 0.5059, 0.5082,
  0.5082, 0.5106, 0.5177, 0.5263, 0.5342, 0.5357, 0.5334, 0.5334, 0.5342, 0.5342, 0.5342, 0.5397, 0.5389, 0.5295, 0.5137,
  0.5043, 0.5051, 0.5067, 0.5098, 0.5114, 0.5137, 0.5161, 0.5177, 0.52, 0.5224, 0.5232, 0.5255, 0.5279, 0.5318, 0.5326, 0.5302,
  0.5185, 0.5067, 0.4886, 0.4894, 0.4839, 0.4823, 0.4839, 0.4855, 0.4847, 0.4847, 0.4847, 0.4808, 0.48, 0.4823, 0.4847, 0.4831,
  0.4815, 0.4831, 0.4823, 0.4831, 0.4839, 0.4776, 0.4745, 0.4792, 0.4808, 0.4855, 0.4941, 0.4973, 0.4965, 0.4957, 0.4965,
  0.4996, 0.4965, 0.4831, 0.4776, 0.4768, 0.4705, 0.4635, 0.4611, 0.4595, 0.4501, 0.4462, 0.4446, 0.4423, 0.436, 0.4305,
  0.4289, 0.4289, 0.4289, 0.4289, 0.4289, 0.4289, 0.4281, 0.4289, 0.4336, 0.4336, 0.4305, 0.425, 0.425, 0.4242, 0.4242, 0.4485,
];
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto(`${LAB}/?tier=T1&scale=1&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const res = await page.evaluate((CREST) => {
    const env = window.__hero.env;
    const cam = env.plateCamera;
    cam.updateMatrixWorld(true);
    const V3 = cam.position.constructor;
    const O = cam.position.clone();
    const viewInv = cam.matrixWorld;
    const meshes = [];
    env.group.updateMatrixWorld(true);
    env.group.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const name = o.name || o.parent?.name || "?";
      if (/BG/.test(name) || /cloud/i.test(name)) return;
      const pos = o.geometry.attributes.position;
      const idx = o.geometry.index;
      const n = pos.count;
      const W = new Float32Array(n * 3);
      const v = new V3();
      let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let k = 0; k < n; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
        W[k * 3] = v.x; W[k * 3 + 1] = v.y; W[k * 3 + 2] = v.z;
        mn = [Math.min(mn[0], v.x), Math.min(mn[1], v.y), Math.min(mn[2], v.z)];
        mx = [Math.max(mx[0], v.x), Math.max(mx[1], v.y), Math.max(mx[2], v.z)];
      }
      const I = idx ? idx.array : Uint32Array.from({ length: n }, (_, k) => k);
      meshes.push({ name, W, I, mn, mx, vis: o.visible });
    });
    // camera view-space depth of a world point (plate camera)
    const camInv = cam.matrixWorldInverse;
    const depthOf = (p) => -p.clone().applyMatrix4(camInv).z;
    const rayDir = (u, vv) => new V3(u * 2 - 1, vv * 2 - 1, 0.5).unproject(cam).sub(O).normalize();
    const hitBox = (o, d, mn, mx) => {
      let t0 = 0, t1 = 1e9;
      for (let a = 0; a < 3; a++) {
        const oa = [o.x, o.y, o.z][a], da = [d.x, d.y, d.z][a];
        if (Math.abs(da) < 1e-12) { if (oa < mn[a] || oa > mx[a]) return false; continue; }
        let ta = (mn[a] - oa) / da, tb = (mx[a] - oa) / da;
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) return false;
      }
      return true;
    };
    const cast = (d, filt) => {
      let best = 1e9, who = null;
      for (const m of meshes) {
        if (filt && !filt(m)) continue;
        if (!hitBox(O, d, m.mn, m.mx)) continue;
        const W = m.W, I = m.I;
        for (let k = 0; k < I.length; k += 3) {
          const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
          const e1x = W[b] - W[a], e1y = W[b + 1] - W[a + 1], e1z = W[b + 2] - W[a + 2];
          const e2x = W[c] - W[a], e2y = W[c + 1] - W[a + 1], e2z = W[c + 2] - W[a + 2];
          const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x;
          const det = e1x * px + e1y * py + e1z * pz;
          if (Math.abs(det) < 1e-12) continue;
          const inv = 1 / det;
          const tx = O.x - W[a], ty = O.y - W[a + 1], tz = O.z - W[a + 2];
          const uu = (tx * px + ty * py + tz * pz) * inv;
          if (uu < 0 || uu > 1) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
          const vv = (d.x * qx + d.y * qy + d.z * qz) * inv;
          if (vv < 0 || uu + vv > 1) continue;
          const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (t > 0.05 && t < best) { best = t; who = m.name; }
        }
      }
      if (!who) return null; const P = O.clone().addScaledVector(d, best); return { t: best, who, depth: depthOf(P), dz: O.z - P.z, y: P.y };
    };
    // the skyline of a filtered set: the highest v (plate uv, up) whose ray hits it, searched downward from vTop
    const PX = 1 / 1273;
    const skyline = (u, vTop, vBot, filt) => {
      let lo = null;
      for (let v = vTop; v >= vBot; v -= 2 * PX) {
        if (cast(rayDir(u, v), filt)) { lo = v; break; }
      }
      if (lo === null) return null;
      let a = lo, b = lo + 2 * PX; // a hits, b misses
      for (let k = 0; k < 6; k++) { const m = (a + b) / 2; if (cast(rayDir(u, m), filt)) a = m; else b = m; }
      const h = cast(rayDir(u, a - 0.5 * PX), filt);
      return { v: a, who: h?.who, depth: h?.depth, dz: h?.dz, y: h?.y };
    };
    const out = [];
    const far = (m) => true;
    for (let i = 0; i < CREST.length; i++) {
      const col = 115 + i;
      const u = (col + 0.5) / 256;
      const c = CREST[i];
      const h = cast(rayDir(u, c - 2 * PX));
      // the full skyline (everything) and the far-only skyline (objects whose hit depth > 118 m), searched from crest + 40 px
      const all = skyline(u, c + 40 * PX, c - 200 * PX, null);
      const farNames = new Set(["Object_2.009", "Object_2.010", "Object_2009", "Object_2010"]);
      const fo = skyline(u, c + 40 * PX, c - 260 * PX, (m) => farNames.has(m.name));
      out.push({ col, u: +u.toFixed(5), crest: c, under: h ? { who: h.who, dz: +h.dz.toFixed(1) } : null, all: all && { v: +all.v.toFixed(5), who: all.who, dz: all.dz && +all.dz.toFixed(1) }, far: fo && { v: +fo.v.toFixed(5), who: fo.who, dz: fo.dz && +fo.dz.toFixed(1) } });
    }
    return { meshes: meshes.map((m) => ({ name: m.name, mn: m.mn.map((x) => +x.toFixed(1)), mx: m.mx.map((x) => +x.toFixed(1)), vis: m.vis, tris: m.I.length / 3 })), cols: out };
  }, CREST);
  fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
  console.log("meshes", res.meshes.length);
  for (const c of res.cols) console.log(c.col, c.crest, JSON.stringify(c.under), "all", JSON.stringify(c.all), "far", JSON.stringify(c.far));
} finally {
  await browser.close();
}
