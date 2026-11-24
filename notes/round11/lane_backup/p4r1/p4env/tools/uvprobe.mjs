// p4env G4 / G3: which baked mesh and which texels a screen region shows, at a pose (the probe.mjs recipes).
//   LAB=http://localhost:5174 node uvprobe.mjs <out.json> '<json [[tag, spot, x, y, w, h, step], ...]>' [qs]
// Each sample: screen x, y -> {mesh, tx, ty (texel of the mesh's baked texture), front (1 front face, 0 back)}.
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const LAB = process.env.LAB || "http://localhost:5174";
const jobs = JSON.parse(process.argv[3]);
const qs = process.argv[4] || "";
const PTR = { rest: [null, 0], left: [-0.98, 0], right: [0.98, 0], top: [0, 0.98], bottom: [0, -0.98], top_left: [-0.98, 0.98], top_right: [0.98, 0.98], bottom_left: [-0.98, -0.98], bottom_right: [0.98, -0.98] };
const SW = { L: [-0.98, 0], R: [0.98, 0], T: [0, 0.98], B: [0, -0.98], BL: [-0.98, -0.98], TR: [0.98, 0.98], C: [null, 0] };
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const results = {};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto(`${LAB}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.evaluate(() => window.__hero.debug.settle(6));
  // build the world-space triangle sets once
  await page.evaluate(() => {
    const env = window.__hero.env;
    env.group.updateMatrixWorld(true);
    const V3 = window.__hero.rig.camera.position.constructor;
    const meshes = [];
    env.group.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position || !o.geometry.attributes.uv) return;
      const name = o.name || "?";
      if (/cloud/i.test(name) || /cloud/i.test(o.parent?.name || "")) return;
      const pos = o.geometry.attributes.position, uv = o.geometry.attributes.uv, idx = o.geometry.index;
      const n = pos.count, W = new Float32Array(n * 3), v = new V3();
      let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let k = 0; k < n; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
        W[k * 3] = v.x; W[k * 3 + 1] = v.y; W[k * 3 + 2] = v.z;
        mn = [Math.min(mn[0], v.x), Math.min(mn[1], v.y), Math.min(mn[2], v.z)];
        mx = [Math.max(mx[0], v.x), Math.max(mx[1], v.y), Math.max(mx[2], v.z)];
      }
      const U = new Float32Array(n * 2);
      for (let k = 0; k < n; k++) { U[k * 2] = uv.getX(k); U[k * 2 + 1] = uv.getY(k); }
      const tex = o.material?.uniforms?.uBaked?.value || o.material?.uniforms?.uBakedMap?.value || null;
      const img = tex?.image;
      meshes.push({ name, W, U, I: idx ? idx.array : Uint32Array.from({ length: n }, (_, k) => k), mn, mx, tw: img?.width || 0, th: img?.height || 0, uniforms: Object.keys(o.material?.uniforms || {}).filter((k) => /bake/i.test(k)) });
    });
    window.__p4meshes = meshes;
  });
  for (const [tag, spot, x0, y0, w, h, step, mirror] of jobs) {
    const res = await page.evaluate(([spot, x0, y0, w, h, step, PTR, SW, mirror]) => {
      const H = window.__hero;
      H.debug.freeze(false);
      if (PTR[spot]) { H.debug.pointer(PTR[spot][0], PTR[spot][1]); H.debug.pose(null); H.debug.settle(2.5); }
      else {
        const [tg, k] = spot.split("_");
        const [ph, tt] = tg === "hold" ? ["expand", 2.97] : tg === "pop" ? ["expand", 0.9] : ["release", 0.33];
        H.debug.pointer(SW[k][0], SW[k][1]);
        if (ph === "expand") { H.debug.pose(ph, 0); H.debug.settle(0.1); }
        H.debug.pose(ph, tt); H.debug.settle(1.6);
      }
      H.debug.freeze(true);
      const cam = H.rig.camera;
      cam.updateMatrixWorld(true);
      const V3 = cam.position.constructor;
      const O = cam.position.clone();
      const meshes = window.__p4meshes;
      const out = [];
      const box = (d, mn, mx) => { let t0 = 0, t1 = 1e9; const o = [O.x, O.y, O.z], dd = [d.x, d.y, d.z]; for (let a = 0; a < 3; a++) { if (Math.abs(dd[a]) < 1e-12) { if (o[a] < mn[a] || o[a] > mx[a]) return false; continue; } let ta = (mn[a] - o[a]) / dd[a], tb = (mx[a] - o[a]) / dd[a]; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false; } return true; };
      for (let y = y0; y < y0 + h; y += step) for (let x = x0; x < x0 + w; x += step) {
        let d = new V3(((x + 0.5) / 1440) * 2 - 1, 1 - ((y + 0.5) / 766) * 2, 0.5).unproject(cam).sub(O).normalize();
        const O0 = O.clone();
        let best = 1e9, hit = null, refl = 0;
        for (let pass = 0; pass < 2; pass++) {
        best = 1e9; hit = null;
        for (const m of meshes) {
          if (!box(d, m.mn, m.mx)) continue;
          const W = m.W, I = m.I;
          for (let k = 0; k < I.length; k += 3) {
            const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
            const e1x = W[b] - W[a], e1y = W[b + 1] - W[a + 1], e1z = W[b + 2] - W[a + 2];
            const e2x = W[c] - W[a], e2y = W[c + 1] - W[a + 1], e2z = W[c + 2] - W[a + 2];
            const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x;
            const det = e1x * px + e1y * py + e1z * pz;
            if (Math.abs(det) < 1e-14) continue;
            const inv = 1 / det;
            const tx = O.x - W[a], ty = O.y - W[a + 1], tz = O.z - W[a + 2];
            const uu = (tx * px + ty * py + tz * pz) * inv;
            if (uu < 0 || uu > 1) continue;
            const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
            const vv = (d.x * qx + d.y * qy + d.z * qz) * inv;
            if (vv < 0 || uu + vv > 1) continue;
            const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
            if (t > 0.05 && t < best) { best = t; hit = { m, k, uu, vv, det }; }
          }
        }
        const tw = d.y < 0 ? -O.y / d.y : 1e9;
        if (pass === 0 && mirror && tw < best) { O.addScaledVector(d, tw); d = new V3(d.x, -d.y, d.z); refl = 1; continue; }
        break;
        }
        O.copy(O0);
        if (!hit) { out.push([x, y, null]); continue; }
        const { m, k, uu, vv, det } = hit;
        const ia = m.I[k], ib = m.I[k + 1], ic = m.I[k + 2];
        const u = m.U[ia * 2] * (1 - uu - vv) + m.U[ib * 2] * uu + m.U[ic * 2] * vv;
        const v = m.U[ia * 2 + 1] * (1 - uu - vv) + m.U[ib * 2 + 1] * uu + m.U[ic * 2 + 1] * vv;
        // front face: the triangle's (CCW) normal faces the camera, i.e. det < 0 for d pointing away from the camera
        out.push([x, y, m.name, +(u * m.tw).toFixed(1), +(v * m.th).toFixed(1), det < 0 ? 1 : 0, +best.toFixed(2), k / 3, refl]);
      }
      return { cam: O.toArray(), out, tex: meshes.map((m) => [m.name, m.tw, m.th, m.uniforms.join("|")]) };
    }, [spot, x0, y0, w, h, step, PTR, SW, !!mirror]);
    results[tag] = res;
    const cnt = {};
    for (const s of res.out) cnt[s[2]] = (cnt[s[2]] || 0) + 1;
    console.log(tag, spot, JSON.stringify(cnt));
  }
} finally {
  fs.writeFileSync(process.argv[2], JSON.stringify(results));
  await browser.close();
}
