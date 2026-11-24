# Small image helper (numpy + OpenImageIO; run with Blender's python -I).
#   crop  out.png zoom x0 y0 x1 y1 in1.png [in2.png ...]   -> stacked vertically, nearest zoom, 2 px separator
#   hcrop out.png zoom x0 y0 x1 y1 in1.png [in2.png ...]   -> side by side
#   stats x0 y0 x1 y1 in.png [...]                          -> mean rgb, luma sd, p1/p10/p50/p90/p99, 4x4 local sd, laplacian
#   diff  out.png gain a.png b.png                          -> |a-b| * gain (luma), plus counts
#   contrast out.png gain x0 y0 x1 y1 zoom in.png [...]     -> (v - mean) * gain + 128, stacked
import sys
import numpy as np
import OpenImageIO as oiio


def load(p):
    b = oiio.ImageBuf(p)
    a = b.get_pixels(oiio.FLOAT)
    if a is None:
        raise SystemExit("cannot read " + p)
    a = np.asarray(a)
    if a.ndim == 2:
        a = a[:, :, None]
    if a.shape[2] == 1:
        a = np.repeat(a, 3, axis=2)
    return a[:, :, :3] * 255.0


def save(p, a):
    a = np.clip(a, 0, 255).astype(np.uint8)
    spec = oiio.ImageSpec(a.shape[1], a.shape[0], 3, oiio.UINT8)
    o = oiio.ImageOutput.create(p)
    o.open(p, spec)
    o.write_image(a)
    o.close()


def luma(a):
    return a[:, :, 0] * 0.2126 + a[:, :, 1] * 0.7152 + a[:, :, 2] * 0.0722


def zoom(a, z):
    z = int(z)
    return np.repeat(np.repeat(a, z, axis=0), z, axis=1) if z > 1 else a


cmd = sys.argv[1]
if cmd in ("crop", "hcrop"):
    out, z, x0, y0, x1, y1 = sys.argv[2], int(sys.argv[3]), *map(int, sys.argv[4:8])
    ims = [zoom(load(p)[y0:y1, x0:x1], z) for p in sys.argv[8:]]
    sep = np.full((2, ims[0].shape[1], 3), 255.0) if cmd == "crop" else np.full((ims[0].shape[0], 2, 3), 255.0)
    parts = []
    for i, m in enumerate(ims):
        if i:
            parts.append(sep)
        parts.append(m)
    save(out, np.concatenate(parts, axis=0 if cmd == "crop" else 1))
elif cmd == "stats":
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    for p in sys.argv[6:]:
        a = load(p)[y0:y1, x0:x1]
        L = luma(a)
        m = a.reshape(-1, 3).mean(0)
        pc = np.percentile(L, [1, 10, 50, 90, 99])
        h, w = L.shape
        h4, w4 = h // 4 * 4, w // 4 * 4
        blk = L[:h4, :w4].reshape(h4 // 4, 4, w4 // 4, 4).std(axis=(1, 3)).mean()
        lap = np.abs(4 * L[1:-1, 1:-1] - L[:-2, 1:-1] - L[2:, 1:-1] - L[1:-1, :-2] - L[1:-1, 2:]).mean()
        print(f"{p.split('/')[-1]:28s} rgb {m[0]:6.1f} {m[1]:6.1f} {m[2]:6.1f}  L {L.mean():6.1f} sd {L.std():5.2f}  p1/10/50/90/99 {pc[0]:5.1f} {pc[1]:5.1f} {pc[2]:5.1f} {pc[3]:5.1f} {pc[4]:5.1f}  sd4 {blk:5.2f} lap {lap:5.2f}  B-R {m[2]-m[0]:5.1f}")
elif cmd == "diff":
    out, g = sys.argv[2], float(sys.argv[3])
    a, b = load(sys.argv[4]), load(sys.argv[5])
    d = np.abs(luma(a) - luma(b))
    dm = np.abs(a - b).max(axis=2)
    print("px>2", int((dm > 2).sum()), "px>8", int((dm > 8).sum()), "px>16", int((dm > 16).sum()), "max", float(dm.max()))
    save(out, np.repeat((d * g)[:, :, None], 3, axis=2))
elif cmd == "contrast":
    out, g = sys.argv[2], float(sys.argv[3])
    x0, y0, x1, y1, z = map(int, sys.argv[4:9])
    ims = []
    for p in sys.argv[9:]:
        a = load(p)[y0:y1, x0:x1]
        ims.append(zoom((a - a.mean(axis=(0, 1))) * g + 128, z))
    sep = np.full((2, ims[0].shape[1], 3), 255.0)
    parts = []
    for i, m in enumerate(ims):
        if i:
            parts.append(sep)
        parts.append(m)
    save(out, np.concatenate(parts, axis=0))
elif cmd == "seq":
    # seq x0 y0 x1 y1 prefix n : temporal stats over consecutive frames prefix_000.png..: mean |dL|, px>12, flicker (sign reversal > 8)
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    pre, n = sys.argv[6], int(sys.argv[7])
    Ls = [luma(load(f"{pre}_{i:03d}.png")[y0:y1, x0:x1]) for i in range(n)]
    d = [Ls[i + 1] - Ls[i] for i in range(n - 1)]
    md = np.mean([np.abs(x).mean() for x in d])
    p12 = np.mean([(np.abs(x) > 12).mean() for x in d])
    fl = np.mean([((d[i] > 8) & (d[i + 1] < -8) | (d[i] < -8) & (d[i + 1] > 8)).mean() for i in range(len(d) - 1)])
    print(f"{pre.split('/')[-1]:10s} mean|dL| {md:6.3f}  px>12 {p12*100:6.3f}%  flicker(>8 reversal) {fl*100:6.3f}%")
