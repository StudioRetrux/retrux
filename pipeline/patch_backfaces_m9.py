# fix round (ENV, judge1 minor "ridge specks"): the back faces of the photogrammetry mountains, seen through the scans' holes
# and hairline cracks, carry bright texels (light-bake fill, or a bright plate sample) while Cycles shades them as the dark
# interior they are (rest plate at the V hole: luma 0.054-0.067, the texels 0.20). Back-facing texels (to the rest camera)
# take the rest plate's colour along their own rest ray (3x3 mean): through a hole that is Cycles' own hole colour, behind
# the front surface it is the front rock's colour (what a crack should show from any view). Texels whose rest ray lands
# within 3 px of a sky / far discontinuity keep their colour. The gutter is rebuilt with comp_env_m9.py's exact algorithm,
# then the texture is encoded as encode_env_m9.py does (Standard view, exposure -2.158, 16-bit PNG, ED dither, WebP q92).
#   BPY -I patch_backfaces.py <out> <ffmpeg> name=srcDir ... [check=srcDir:name:publishedWebp]
import sys, os, json, subprocess, time
import numpy as np
import OpenImageIO as oiio

OUT = os.path.abspath(sys.argv[1])
FF = sys.argv[2]
ARGS = [a for a in sys.argv[3:]]
EXPO = -2.158
for d in ("tex", "png16", "webp"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)


def rd(p):
    b = oiio.ImageBuf(p)
    s = b.spec()
    return np.asarray(b.get_pixels(oiio.FLOAT)).reshape(s.height, s.width, s.nchannels)


def encode(lin_rgb, fn):
    lin = np.clip(lin_rgb * (2.0 ** EXPO), 0.0, 1.0)
    s = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1.0 / 2.4) - 0.055)
    q16 = np.ascontiguousarray(np.round(s * 65535.0).astype(np.uint16))
    png = os.path.join(OUT, "png16", fn + ".png")
    spec = oiio.ImageSpec(q16.shape[1], q16.shape[0], 3, oiio.UINT16)
    b = oiio.ImageBuf(spec)
    b.set_pixels(oiio.ROI(), q16)
    b.write(png)
    webp = os.path.join(OUT, "webp", fn + ".webp")
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", png, "-sws_dither", "ed", "-vf", "format=rgb24",
                    "-c:v", "libwebp", "-quality", "92", "-compression_level", "6", webp], check=True)
    return webp


def pushpull(v, w):
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
        pyr.append((a.reshape(n, 2, n, 2, -1).sum((1, 3)), b.reshape(n, 2, n, 2).sum((1, 3))))
    col = pyr[-1][0] / np.maximum(pyr[-1][1], 1e-12)[..., None]
    for a, b in reversed(pyr[:-1]):
        up = np.repeat(np.repeat(col, 2, axis=0), 2, axis=1)
        own = a / np.maximum(b, 1e-12)[..., None]
        k = np.clip(b, 0.0, 1.0)[..., None]
        col = own * k + up * (1.0 - k)
    return col[:H, :W]


def gutter(final, cov, dilate=16):
    # comp_env_m9.py: the islands' edge colours dilated 16 texels (4-neighbour mean), then push-pull.
    fc = np.where(cov[..., None], final, 0.0).astype(np.float64)
    fcov = cov.copy()
    for _ in range(dilate):
        acc = np.zeros_like(fc)
        cnt = np.zeros(fcov.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            m = np.roll(np.roll(fcov, dy, 0), dx, 1)
            acc += np.roll(np.roll(fc, dy, 0), dx, 1) * m[..., None]
            cnt += m
        grow = (~fcov) & (cnt > 0)
        fc[grow] = acc[grow] / cnt[grow][:, None]
        fcov = fcov | grow
    return pushpull(fc, fcov.astype(np.float64))


report = {}
for a in ARGS:
    if a.startswith("check="):
        # encoder check: the unpatched EXR must encode byte-identical to the published WebP
        srcdir, name, pub = a.split("=", 1)[1].split(":")
        t = rd(os.path.join(srcdir, "tex", name + ".exr"))[..., :3]
        fn = name.replace(" ", "_").replace(".", "_") + "_check"
        w = encode(t, fn)
        same = open(w, "rb").read() == open(pub, "rb").read()
        print("CHECK", name, "byte-identical to the published webp:", same, os.path.getsize(w), os.path.getsize(pub), flush=True)
        report["check_" + name] = same
        continue
    name, srcdir = a.split("=", 1)
    t0 = time.time()
    base = os.path.dirname(srcdir.rstrip("/")) if False else srcdir
    # (comp_env_m9.py works with rows from the BOTTOM: the raster, the plates' depth maps and its read_img; the EXR files are
    # top-down. Everything below is bottom-up, the output is flipped back.)
    tex = rd(os.path.join(srcdir, "tex", name + ".exr"))[::-1, :, :3].astype(np.float64)
    d = np.load(os.path.join(srcdir, "raster", name + ".npz"))
    P, N, cov = d["P"].astype(np.float64), d["N"].astype(np.float64), d["cov"]
    cam = [c for c in json.load(open(os.path.join(srcdir, "cams.json"))) if c["name"] == "plate_rest"][0]
    D = np.load(os.path.join(srcdir, "maps", "plate_rest.npy"))
    D = np.where(np.isfinite(D), D, 1e6)
    plate = rd(cam["exr"])[::-1, :, :3].astype(np.float64)
    Hp, Wp = D.shape
    ys, xs = np.nonzero(cov)
    Pt = P[ys, xs]
    Nt = N[ys, xs]
    pos = np.asarray(cam["pos"], np.float64)
    Vt = pos[None, :] - Pt
    Lt = np.linalg.norm(Vt, axis=1)
    ndv = np.einsum("ij,ij->i", Nt / np.maximum(np.linalg.norm(Nt, axis=1, keepdims=True), 1e-9), Vt / Lt[:, None])
    PV = np.asarray(cam["PV"], np.float64)
    hp = Pt @ PV[:3, :3].T + PV[:3, 3]
    w = Pt @ PV[3, :3] + PV[3, 3]
    ndc = hp[:, :2] / np.where(np.abs(w) < 1e-9, 1e-9, w)[:, None]
    px = (ndc * 0.5 + 0.5) * np.array([cam["W"], cam["H"]]) - 0.5
    ix = np.round(px[:, 0]).astype(np.int64)
    iy = np.round(px[:, 1]).astype(np.int64)
    inside = (w > 0) & (ix >= 4) & (ix <= Wp - 5) & (iy >= 4) & (iy <= Hp - 5)
    back = (ndv < -0.05) & inside
    # far / sky discontinuity within 3 px of the rest ray: skip (the plate's colour there is a sky blend)
    idx = np.nonzero(back)[0]
    farnear = np.zeros(len(idx), bool)
    col = np.zeros((len(idx), 3))
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            Dn = D[iy[idx] + dy, ix[idx] + dx]
            farnear |= (Dn > Lt[idx] * 1.3) | (Dn > 9e5)
            if abs(dy) <= 1 and abs(dx) <= 1:
                col += plate[iy[idx] + dy, ix[idx] + dx]
    col /= 9.0
    sel = idx[~farnear]
    newc = col[~farnear]
    L = lambda c: c @ np.array([0.2126, 0.7152, 0.0722])
    before = L(tex[ys[sel], xs[sel]])
    after = L(newc)
    patched = tex.copy()
    patched[ys[sel], xs[sel]] = newc
    final = gutter(patched, cov)[::-1]
    out = np.concatenate([final, np.ones(final.shape[:2] + (1,))], 2).astype(np.float32)
    spec = oiio.ImageSpec(out.shape[1], out.shape[0], 4, oiio.HALF)
    spec.attribute("compression", "zip")
    b = oiio.ImageBuf(spec)
    b.set_pixels(oiio.ROI(), out)
    b.write(os.path.join(OUT, "tex", name + ".exr"))
    fn = name.replace(" ", "_").replace(".", "_")
    webp = encode(final, fn)
    rec = {"src": srcdir, "texels": int(len(ys)), "back_inside": int(back.sum()), "skipped_near_far": int(farnear.sum()),
           "patched": int(len(sel)), "luma_before_mean": float(before.mean()) if len(sel) else 0.0,
           "luma_after_mean": float(after.mean()) if len(sel) else 0.0,
           "patched_brighter_than_2x_after": int((before > 2 * after + 0.01).sum()), "webp_bytes": os.path.getsize(webp),
           "seconds": round(time.time() - t0, 1)}
    report[name] = rec
    print("PATCH", name, json.dumps(rec), flush=True)
json.dump(report, open(os.path.join(OUT, "patch_report.json"), "w"), indent=1)
