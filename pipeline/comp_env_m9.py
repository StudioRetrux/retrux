# Baked environment v9: the colour compositor (numpy + OpenImageIO; runs with Blender's bundled python, `python3.13 -I`).
# Inputs from bake_env_m9.py in <out>: cams.json, maps/<cam>.npy (distance maps of the SHIPPED meshes, rows from the bottom),
# raster/<obj>.npz (texel world position / normal / coverage), light/<obj>.exr (Cycles light bake). Colour from the Cycles
# plates (scene-linear EXR, never the WebPs).
#   python3.13 -I comp_env_m9.py <out> [only=A,B] [order=plate_rest,plate_tilt,...] [tau=0.03] [band=2] [feather=3]
# Per texel and plate camera: inside the plate (>= 2 px from its border), the bilinear depth test against the camera's
# distance map (L_texel <= L_map * 1.003 + 3 cm), not within `band` px of a depth discontinuity (the plate's anti-aliased
# rims mix the occluder and the background; such a texel would carry a ghost of the edge when the camera moves), plate
# alpha 1. Colour: 4 sub-samples over the texel footprint, bilinear. Sources take over in priority order (rest first: the
# rest view stays pixel-faithful), each weight feathered over `feather` texels inside its own region (static weights in UV
# space: no camera pose can double anything). Texels no plate sees: the Cycles light bake (3x3 median) times a spatial
# gain map blur(plate)/blur(light) (push-pull, so the plates' mist and grade carry into hidden texels), blended near plate
# texels with the plates' colour extrapolated by push-pull (no seam at the band). Gutter: push-pull of the final colour.
# Writes <out>/tex/<obj>.exr (linear, half, rows top-down = image orientation), <out>/tex/<obj>_src.png (debug: source per
# texel) and <out>/comp/<obj>.json (shares, gains).
import sys, os, json, time
import numpy as np
import OpenImageIO as oiio

OUT = os.path.abspath(sys.argv[1])
FLAGS = dict(a.split("=", 1) for a in sys.argv[2:] if "=" in a)
ONLY = [n for n in FLAGS.get("only", "").split(",") if n]
ORDER = FLAGS.get("order", "plate_rest,plate_tilt,plate_hold,plate_orbN,plate_orbP").split(",")
TAU = float(FLAGS.get("tau", 0.03))
BAND = int(FLAGS.get("band", 2))
FEATHER = int(FLAGS.get("feather", 3))
RELAX0 = float(FLAGS.get("relax", 0.015))
# The relaxed tier only on the photogrammetry mountains (folded slivers); on rocks / floes / the mound it let far-side texels
# of small-depth silhouettes take the anti-aliased rim (bright specks, v9c).
RELAX_OBJS = [n for n in FLAGS.get("relaxobjs", "V2_Ridge,V2_Massif,Object_2.009,Object_2.010").split(",") if n]
MATCH = FLAGS.get("match", "0") == "1"
MT_REL = float(FLAGS.get("mtrel", 0.004))
MT_ABS = float(FLAGS.get("mtabs", 0.04))
EXPO = -2.158
os.makedirs(os.path.join(OUT, "tex"), exist_ok=True)
os.makedirs(os.path.join(OUT, "comp"), exist_ok=True)
T0 = time.time()
LOG = open(os.path.join(OUT, "comp_log.txt"), "a")


def log(*a):
    s = time.strftime("%H:%M:%S ") + " ".join(str(x) for x in a)
    print(s, flush=True)
    LOG.write(s + "\n")
    LOG.flush()


def read_img(p):
    b = oiio.ImageBuf(p)
    a = b.get_pixels(oiio.FLOAT)
    return a[::-1].copy()                      # rows from the BOTTOM (Blender / UV convention)


def write_img(p, a, fmt=oiio.HALF):
    a = np.ascontiguousarray(a[::-1])          # image orientation (top row = v 1)
    spec = oiio.ImageSpec(a.shape[1], a.shape[0], a.shape[2], fmt)
    if p.endswith(".exr"):
        spec.attribute("compression", "zip")
    b = oiio.ImageBuf(spec)
    b.set_pixels(oiio.ROI(), a)
    b.write(p)


def shift_max(m, r):
    # max filter (2r+1)^2, separable, edge-clamped
    out = m.copy()
    for ax in (0, 1):
        acc = out.copy()
        for k in range(1, r + 1):
            acc = np.maximum(acc, np.roll(out, k, axis=ax))
            acc = np.maximum(acc, np.roll(out, -k, axis=ax))
        out = acc
    return out


def box(m, r):
    # separable box blur (2r+1), edge-clamped; m (H, W) or (H, W, C)
    if r < 1:
        return m
    k = 2 * r + 1
    pad = [(r + 1, r), (0, 0)] + [(0, 0)] * (m.ndim - 2)
    c = np.cumsum(np.pad(m, pad, mode='edge'), axis=0)
    m = (c[k:] - c[:-k]) / k
    pad = [(0, 0), (r + 1, r)] + [(0, 0)] * (m.ndim - 2)
    c = np.cumsum(np.pad(m, pad, mode='edge'), axis=1)
    return (c[:, k:] - c[:, :-k]) / k


def normblur(v, w, r):
    # blur of v over the texels where w > 0, normalised (the gutter does not pull values down)
    if v.ndim == 3:
        num = box(v * w[..., None], r)
        den = box(w, r)[..., None]
    else:
        num = box(v * w, r)
        den = box(w, r)
    return num / np.maximum(den, 1e-8), (den[..., 0] if v.ndim == 3 else den)


def pushpull(v, w):
    # Fill v (H, W, C) wherever w < 1 from coarser levels (weights w in [0, 1]); returns the filled field.
    H, W = w.shape
    S = 1
    while S < max(H, W):
        S *= 2
    vp = np.zeros((S, S, v.shape[2]), dtype=np.float64)
    wp = np.zeros((S, S), dtype=np.float64)
    vp[:H, :W] = v * w[..., None]
    wp[:H, :W] = w
    pyr = [(vp, wp)]
    while pyr[-1][1].shape[0] > 1:
        a, b = pyr[-1]
        n = a.shape[0] // 2
        a2 = a.reshape(n, 2, n, 2, -1).sum((1, 3))
        b2 = b.reshape(n, 2, n, 2).sum((1, 3))
        pyr.append((a2, b2))
    # pull: from the coarsest, normalised colour
    col = pyr[-1][0] / np.maximum(pyr[-1][1], 1e-12)[..., None]
    for a, b in reversed(pyr[:-1]):
        up = np.repeat(np.repeat(col, 2, axis=0), 2, axis=1)
        own = a / np.maximum(b, 1e-12)[..., None]
        k = np.clip(b, 0.0, 1.0)[..., None]   # a fully covered texel keeps its own value
        col = own * k + up * (1.0 - k)
    return col[:H, :W]


def bilinear(img, px):
    H, W = img.shape[:2]
    x = np.clip(px[:, 0], 0, W - 1.001)
    y = np.clip(px[:, 1], 0, H - 1.001)
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    fx = (x - x0)
    fy = (y - y0)
    if img.ndim == 3:
        fx = fx[:, None]
        fy = fy[:, None]
    return (img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx) * (1 - fy) + (img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx) * fy


def project(cam, P):
    PV = np.asarray(cam["PV"], dtype=np.float64)
    hp = P @ PV[:3, :3].T + PV[:3, 3]
    w = P @ PV[3, :3] + PV[3, 3]
    ndc = hp[:, :2] / np.where(np.abs(w) < 1e-9, 1e-9, w)[:, None]
    px = (ndc * 0.5 + 0.5) * np.array([cam["W"], cam["H"]]) - 0.5
    inside = (w > 0) & (px[:, 0] >= 2) & (px[:, 0] <= cam["W"] - 3) & (px[:, 1] >= 2) & (px[:, 1] <= cam["H"] - 3)
    return px, inside


def matched(c, P):
    # Depth-matched bilinear sampling: of the 4 plate pixels around P's projection, only those whose surface (its depth
    # extrapolated along the pixel's own depth slope, so grazing planes still match) lies at P's depth count. A texel seen
    # through a 1-px hole takes the hole pixel; a texel beside a silhouette takes only pixels of its own surface.
    # Returns the projected px, inside flag, the matched weight sum and the matched colour.
    px, inside = project(c, P)
    H, W = c["D"].shape
    x = np.clip(px[:, 0], 0, W - 1.001)
    y = np.clip(px[:, 1], 0, H - 1.001)
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    fx = x - x0
    fy = y - y0
    Lt = np.linalg.norm(P - np.asarray(c["pos"])[None, :], axis=1)
    tol = Lt * MT_REL + MT_ABS
    wsum = np.zeros(len(P))
    col = np.zeros((len(P), 3))
    amin = np.ones(len(P))
    for dx, dy, wb in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        xx = x0 + dx
        yy = y0 + dy
        pred = c["D"][yy, xx] + c["gx"][yy, xx] * (x - xx) + c["gy"][yy, xx] * (y - yy)
        m = np.abs(pred - Lt) <= tol
        wm = wb * m
        wsum += wm
        col += wm[:, None] * c["rgb"][yy, xx]
        amin = np.where(m, np.minimum(amin, c["alpha"][yy, xx]), amin)
    col /= np.maximum(wsum, 1e-9)[:, None]
    return px, inside, Lt, wsum, col, amin


# ------------------------------------------------------------------------------------------------ cameras
cams = {c["name"]: c for c in json.load(open(os.path.join(OUT, "cams.json")))}
plates = [cams[n] for n in ORDER if n in cams and cams[n].get("exr")]
probes = [c for c in cams.values() if c["kind"] == "probe"]
for c in plates + probes:
    D = np.load(os.path.join(OUT, "maps", c["name"] + ".npy"))
    c["D"] = np.where(np.isfinite(D), D, 1e6).astype(np.float32)
for c in plates:
    t = time.time()
    img = read_img(c["exr"])
    c["rgb"] = img[:, :, :3].astype(np.float32)
    c["alpha"] = img[:, :, 3].astype(np.float32)
    D = c["D"]
    # depth discontinuities: relative second difference along x / y (a planar slope, even grazing, has ~0), or a no-hit
    # neighbour; grown by BAND px
    e = np.zeros(D.shape, dtype=bool)
    rel = np.abs(D[:, :-2] - 2 * D[:, 1:-1] + D[:, 2:]) / np.maximum(D[:, 1:-1], 1e-3)
    e[:, 1:-1] |= rel > TAU
    rel = np.abs(D[:-2, :] - 2 * D[1:-1, :] + D[2:, :]) / np.maximum(D[1:-1, :], 1e-3)
    e[1:-1, :] |= rel > TAU
    e |= D > 9e5
    c["band"] = shift_max(e, BAND) if BAND > 0 else e
    # nearest edge depth around each pixel: a texel farther than it (by > 1.5 % + 5 cm) lies on the FAR side of an
    # occlusion edge, where the plate's anti-aliased rim and denoise carry the occluder's colour (a ghost of the edge
    # whenever the camera moves). The near side keeps its plate texels (its rim moves with its own surface).
    De = np.where(e & (D < 9e5), D, np.float32(1e7))
    c["emin"] = -shift_max(-De, BAND) if BAND > 0 else De
    gf = np.zeros_like(D); gb = np.zeros_like(D)
    gf[:, :-1] = D[:, 1:] - D[:, :-1]
    gb[:, 1:] = D[:, 1:] - D[:, :-1]
    c["gx"] = np.where(np.abs(gf) < np.abs(gb), gf, gb).astype(np.float32)
    gf = np.zeros_like(D); gb = np.zeros_like(D)
    gf[:-1, :] = D[1:, :] - D[:-1, :]
    gb[1:, :] = D[1:, :] - D[:-1, :]
    c["gy"] = np.where(np.abs(gf) < np.abs(gb), gf, gb).astype(np.float32)
    log("plate %s %dx%d edges %.2f%% band %.2f%% (%.1f s)" % (c["name"], D.shape[1], D.shape[0], 100 * e.mean(), 100 * c["band"].mean(), time.time() - t))

objects = sorted(f[:-4] for f in os.listdir(os.path.join(OUT, "raster")) if f.endswith(".npz"))
if ONLY:
    objects = [o for o in objects if o in ONLY]
SRC_COL = {"plate_rest": (0.1, 0.9, 0.1), "plate_tilt": (0.2, 0.4, 1.0), "plate_hold": (0.9, 0.2, 0.9),
           "plate_orbN": (1.0, 0.9, 0.1), "plate_orbP": (0.1, 0.9, 0.9)}

for name in objects:
    t = time.time()
    d = np.load(os.path.join(OUT, "raster", name + ".npz"))
    P, cov = d["P"], d["cov"]
    tid = d["tid"]
    Hs, Ws = cov.shape
    ys, xs = np.nonzero(cov)
    n = len(ys)
    Pt = P[ys, xs].astype(np.float64)
    # texel footprint (finite differences inside the same triangle, else one-sided, else 0)
    def fd(dy, dx):
        y2 = np.clip(ys + dy, 0, Hs - 1)
        x2 = np.clip(xs + dx, 0, Ws - 1)
        ok = cov[y2, x2] & (tid[y2, x2] == tid[ys, xs])
        return np.where(ok[:, None], (P[y2, x2].astype(np.float64) - Pt) * (1 if dx + dy > 0 else -1), np.nan)
    dPx = fd(0, 1)
    dPx = np.where(np.isnan(dPx), fd(0, -1), dPx)
    dPy = fd(1, 0)
    dPy = np.where(np.isnan(dPy), fd(-1, 0), dPy)
    dPx = np.nan_to_num(dPx)
    dPy = np.nan_to_num(dPy)
    W_acc = np.zeros(n)
    C_acc = np.zeros((n, 3))
    shares = {}
    dom = np.full(n, -1, dtype=np.int16)
    domw = np.zeros(n)
    RELAX = RELAX0 if name in RELAX_OBJS else 0.0
    # tiers: (camera, relaxed, depth-matched, extra): strict for every object; on the mountains a depth-matched tier (texels
    # seen only through 1-px gaps take the gap pixel) and then the relaxed one.
    tiers = [(ci, c, False, MATCH, False) for ci, c in enumerate(plates)]
    if RELAX > 0:
        tiers += [(ci, c, False, True, True) for ci, c in enumerate(plates)]
        tiers += [(ci, c, True, False, True) for ci, c in enumerate(plates)]
    for ci, c, relaxed, mt, extra in tiers:
        px, inside = project(c, Pt)
        idx = np.nonzero(inside & (W_acc < 0.999))[0] if extra else np.nonzero(inside)[0]
        w = np.zeros(n)
        if len(idx):
            Lt = np.linalg.norm(Pt[idx] - np.asarray(c["pos"])[None, :], axis=1)
            if relaxed:
                # Relaxed tier (mountains only, after every strict plate): a texel within RELAX (1.5 %) + 0.3 m of the
                # bilinear depth the plate saw takes that pixel's colour. Folded sub-pixel slivers of the scans, drawn by
                # the engine at pixel centres where the finer plate saw their neighbours, otherwise took the fill (faint
                # light dashes). Parallax error sub-pixel by construction (1.5 % of the depth).
                Ls = bilinear(c["D"], px[idx])
                vis = Lt <= Ls * (1.0 + RELAX) + 0.3
            elif mt:
                _, _, _, wsm, _, am = matched(c, Pt[idx])
                vis = (wsm >= 0.1) & (am >= 0.999)
            else:
                Ls = bilinear(c["D"], px[idx])
                vis = Lt <= Ls * 1.003 + 0.03
            xi = np.clip(np.round(px[idx, 0]).astype(np.int64), 0, c["W"] - 1)
            yi = np.clip(np.round(px[idx, 1]).astype(np.int64), 0, c["H"] - 1)
            # far side of an occlusion edge: excluded in both tiers (the relaxed one only lets texels within its own
            # tolerance of the nearest edge through: folds and slivers, never the sky behind a silhouette)
            okb = ~(c["band"][yi, xi] & (Lt > (c["emin"][yi, xi] * (1.0 + RELAX) + 0.3 if relaxed else c["emin"][yi, xi] * 1.015 + 0.05)))
            oka = bilinear(c["alpha"], px[idx]) >= 0.999
            w[idx] = (vis & okb & oka).astype(np.float64)
        # feather inside the camera's own region (UV space, gutter ignored)
        if FEATHER > 0 and w.any():
            wm = np.zeros((Hs, Ws))
            wm[ys, xs] = w
            fb, _ = normblur(wm, cov.astype(np.float64), FEATHER)
            w = np.minimum(w, fb[ys, xs] * 1.0)
            # a texel fully inside keeps 1; the falloff only lives near the region's boundary
            w = np.clip((w - 0.0) / 1.0, 0.0, 1.0)
        take = w * (1.0 - W_acc)
        sel = np.nonzero(take > 1e-6)[0]
        if len(sel):
            col = np.zeros((len(sel), 3))
            cw = np.zeros(len(sel))
            for sx, sy in ((-0.25, -0.25), (0.25, -0.25), (-0.25, 0.25), (0.25, 0.25)):
                Ps = Pt[sel] + dPx[sel] * sx + dPy[sel] * sy
                if relaxed or not mt:
                    pxs, _ = project(c, Ps)
                    col += bilinear(c["rgb"], pxs)
                    cw += 1.0
                else:
                    _, _, _, wsm, cs, _ = matched(c, Ps)
                    ok = wsm >= 0.05
                    col += cs * ok[:, None]
                    cw += ok
            # (a texel whose sub-samples all miss keeps its centre's matched colour)
            if mt and not relaxed:
                _, _, _, wc, cc, _ = matched(c, Pt[sel])
                col = np.where((cw > 0)[:, None], col / np.maximum(cw, 1)[:, None], cc)
            else:
                col /= np.maximum(cw, 1)[:, None]
            C_acc[sel] += col * take[sel, None]
            W_acc[sel] += take[sel]
        better = take > domw
        dom[better] = ci + (100 if relaxed else (200 if extra else 0))
        domw[better] = take[better]
        key = c["name"] + ("~" if relaxed else ("^" if extra else ""))
        shares[key] = round(float(take.sum() / max(n, 1)), 4)
    # engine-visible texels (any probe view) that no plate covers: the gap the light bake has to fill in plain view
    seen = np.zeros(n, dtype=bool)
    for c in probes:
        px, inside = project(c, Pt)
        idx = np.nonzero(inside)[0]
        if len(idx):
            Lt = np.linalg.norm(Pt[idx] - np.asarray(c["pos"])[None, :], axis=1)
            Ls = bilinear(c["D"], px[idx])
            seen[idx] |= Lt <= Ls * 1.003 + 0.03
    gap = seen & (W_acc < 0.5)
    gap_by = {}
    for c in probes:
        px, inside = project(c, Pt)
        idx = np.nonzero(inside & gap)[0]
        if len(idx):
            Lt = np.linalg.norm(Pt[idx] - np.asarray(c["pos"])[None, :], axis=1)
            vv = Lt <= bilinear(c["D"], px[idx]) * 1.003 + 0.03
            # screen area of those texels in the probe (plate px^2 at full plate res): |dPx x dPy| projected
            pa, _ = project(c, Pt[idx[vv]])
            pb, _ = project(c, Pt[idx[vv]] + dPx[idx[vv]])
            pc, _ = project(c, Pt[idx[vv]] + dPy[idx[vv]])
            ar = 0.5 * 4.0 * np.abs(np.cross(pb - pa, pc - pa)) * 2.0
            gap_by[c["name"]] = [int(vv.sum()), int(ar.sum())]
    # ---- fill: light bake x gain map, and the plates extrapolated near plate texels
    lp = os.path.join(OUT, "light", name + ".exr")
    Wm = np.zeros((Hs, Ws))
    Wm[ys, xs] = W_acc
    Cm = np.zeros((Hs, Ws, 3))
    Cm[ys, xs] = C_acc / np.maximum(W_acc, 1e-9)[:, None]
    if os.path.exists(lp):
        L = read_img(lp)[:, :, :3].astype(np.float64)
        # 3x3 median against fireflies, then to the texture size (bilinear)
        st = np.stack([np.roll(np.roll(L, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)], 0)
        L = np.median(st, axis=0)
        if L.shape[0] != Hs or L.shape[1] != Ws:
            yy = (np.arange(Hs) + 0.5) * L.shape[0] / Hs - 0.5
            xx = (np.arange(Ws) + 0.5) * L.shape[1] / Ws - 0.5
            gy, gx = np.meshgrid(yy, xx, indexing="ij")
            L = bilinear(L, np.stack([gx.ravel(), gy.ravel()], 1)).reshape(Hs, Ws, 3)
    else:
        L = np.full((Hs, Ws, 3), 0.5)
    m = ((Wm > 0.95) & cov).astype(np.float64)
    if m.sum() > 50:
        # gain map at ~1/16 of the texture (sigma ~ 16-32 texels), push-pull into the hidden texels
        f = 16
        hs, wsz = (Hs + f - 1) // f, (Ws + f - 1) // f
        def down(a):
            pad = ((0, hs * f - Hs), (0, wsz * f - Ws)) + ((0, 0),) * (a.ndim - 2)
            a = np.pad(a, pad)
            return a.reshape(hs, f, wsz, f, *a.shape[2:]).sum((1, 3))
        num = down(Cm * m[..., None])
        den = down(L * m[..., None])
        cnt = down(m)
        g = num / np.maximum(den, 1e-6)
        wg = np.clip(cnt / (f * f * 0.25), 0, 1)
        g = pushpull(np.log(np.clip(g, 0.2, 5.0)), wg)
        g = np.exp(box(g, 1))
        G = np.repeat(np.repeat(g, f, 0), f, 1)[:Hs, :Ws]
        G = box(G, f // 2)
    else:
        G = np.ones((Hs, Ws, 3))
    LG = L * G
    E = pushpull(Cm, np.clip(Wm, 0, 1) * cov) if Wm.max() > 0 else LG
    near = normblur(np.clip(Wm, 0, 1), cov.astype(np.float64), 4)[0]
    beta = np.clip((0.6 - near) / 0.5, 0.0, 1.0)[..., None]     # far from plate texels -> light bake
    fill = E * (1.0 - beta) + LG * beta
    final = Cm * Wm[..., None] + fill * (1.0 - Wm[..., None])
    final = np.where(cov[..., None], final, 0.0)
    # Gutter: first the islands' own edge colours dilated outwards (16 texels, 4-neighbour mean), so mips and any sliver
    # whose bake UVs touch the gutter read their own island's colour; push-pull fills what is left.
    fc = final.copy()
    fcov = cov.copy()
    for _ in range(int(FLAGS.get("dilate", 16))):
        acc = np.zeros_like(fc)
        cnt = np.zeros(fcov.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            m = np.roll(np.roll(fcov, dy, 0), dx, 1)
            acc += np.roll(np.roll(fc, dy, 0), dx, 1) * m[..., None]
            cnt += m
        grow = (~fcov) & (cnt > 0)
        fc[grow] = acc[grow] / cnt[grow][:, None]
        fcov = fcov | grow
    final = pushpull(fc, fcov.astype(np.float64))
    out = np.concatenate([final, np.ones((Hs, Ws, 1))], 2).astype(np.float32)
    write_img(os.path.join(OUT, "tex", name + ".exr"), out)
    # debug: dominant source colour x weight; fill red; gap (engine-visible, no plate) bright red
    dbg = np.zeros((Hs, Ws, 3), dtype=np.float32)
    dbg[..., :] = 0.08 * cov[..., None]
    dc = np.zeros((n, 3))
    for ci, c in enumerate(plates):
        selc = dom == ci
        dc[selc] = np.array(SRC_COL.get(c["name"], (1, 1, 1))) * (0.35 + 0.65 * domw[selc, None])
        selr = dom == ci + 100
        dc[selr] = np.array(SRC_COL.get(c["name"], (1, 1, 1))) * 0.5 + np.array([0.3, 0.0, 0.3])
        selm = dom == ci + 200
        dc[selm] = np.array(SRC_COL.get(c["name"], (1, 1, 1))) * 0.5 + np.array([0.0, 0.3, 0.3])
    dc[W_acc < 0.5] = (0.45, 0.05, 0.05)
    dc[gap] = (1.0, 0.1, 0.1)
    dbg[ys, xs] = dc
    write_img(os.path.join(OUT, "tex", name + "_src.png"), dbg, oiio.UINT8)
    rec = {"size": [Ws, Hs], "texels": int(n), "shares": shares, "fill": round(float((1 - W_acc).sum() / max(n, 1)), 4),
           "engine_seen": round(float(seen.mean()), 4), "gap": round(float(gap.mean()), 4),
           "gap_of_seen": round(float(gap.sum() / max(seen.sum(), 1)), 4),
           "gap_by_probe(texels,plate_px2)": gap_by,
           "gain_median": np.round(np.median(G[cov], axis=0), 3).tolist() if cov.any() else None}
    json.dump(rec, open(os.path.join(OUT, "comp", name + ".json"), "w"), indent=1)
    log("COMP %-20s %dx%d texels %d  shares %s fill %.3f  seen %.3f gap %.4f (of seen %.4f)  gain %s  (%.1f s)" % (
        name, Ws, Hs, n, shares, rec["fill"], rec["engine_seen"], rec["gap"], rec["gap_of_seen"], rec["gain_median"], time.time() - t))
log("DONE %.0f s" % (time.time() - T0))
