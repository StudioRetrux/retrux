# p4ice metrics on the panel's boxes (BPY python: numpy + OpenImageIO; run with -I).
#   icem.py <label=dir-or-prefix> ...   each label: name=path_prefix (files <prefix>q00_rest.png etc.)
# REF frames come from the reference folder. Values in 0..255 display levels.
import sys
import numpy as np
import OpenImageIO as oiio

REF = "/Users/muhamadrifaldi/RetruxR11Work/hp/reference/"
REFS = {"q00_rest": "ref_F000", "q01_loop15": "loop_F015", "q02_loop30": "loop_F030", "q03_eye": "loop_F045",
        "p04_expand_pop": "ref_F358", "p05_expand": "ref_F402", "p06_sustain": "ref_F420"}


def load(p):
    b = oiio.ImageBuf(p)
    a = b.get_pixels(oiio.FLOAT)
    if a is None or a.size == 0:
        return None
    return a[..., :3] * 255.0


def L(a):
    return a @ np.array([0.2126, 0.7152, 0.0722])


def gk(s):
    r = int(3 * s + 1)
    x = np.arange(-r, r + 1)
    k = np.exp(-x * x / (2 * s * s))
    return k / k.sum()


def blur(img, s):
    k = gk(s)
    out = np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 0, img)
    return np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 1, out)


def box(a, x0, x1, y0, y1):
    return a[y0:y1, x0:x1]


def stats(a, bx):
    x0, x1, y0, y1 = bx
    c = box(a, x0, x1, y0, y1)
    l = L(c)
    m = c.reshape(-1, 3).mean(0)
    return l.mean(), l.std(), np.percentile(l, 5), np.percentile(l, 95), m


def lap(a, bx):
    x0, x1, y0, y1 = bx
    l = L(a[y0 - 1:y1 + 1, x0 - 1:x1 + 1])
    q = 4 * l[1:-1, 1:-1] - l[:-2, 1:-1] - l[2:, 1:-1] - l[1:-1, :-2] - l[1:-1, 2:]
    return np.abs(q).mean()


def dog(a, bx):
    x0, x1, y0, y1 = bx
    pad = 16
    l = L(a[y0 - pad:y1 + pad, x0 - pad:x1 + pad])
    d = blur(l, 1.0) - blur(l, 4.0)
    return d[pad:-pad, pad:-pad].std()


def lf(a, bx):
    x0, x1, y0, y1 = bx
    pad = 24
    l = L(a[y0 - pad:y1 + pad, x0 - pad:x1 + pad])
    return blur(l, 4.0)[pad:-pad, pad:-pad].std()


def sat(c):
    mx = c.max(-1)
    mn = c.min(-1)
    return ((mx - mn) / np.maximum(mx, 1e-3)).mean()


BOXES = {
    "q00_rest": {"bandR": (790, 860, 352, 410), "bandL": (585, 650, 352, 410), "lowArcs": (600, 840, 440, 530),
                 "overOrb": (690, 750, 362, 402), "besideOrb": (790, 850, 362, 402), "upper": (600, 840, 150, 230)},
    "q01_loop15": {"innerBand": (660, 780, 372, 406), "bigRing": (560, 640, 200, 500)},
    "q02_loop30": {"center": (600, 840, 330, 420)},
    "q03_eye": {"ringD": (680, 770, 382, 402), "outerR": (800, 830, 260, 350)},
    "p05_expand": {"topArc": (650, 850, 60, 140), "rightArc": (890, 1060, 160, 540)},
    "p06_sustain": {"band": (520, 960, 410, 530), "lower": (520, 960, 470, 530)},
}


def report(name, files):
    print(f"== {name}")
    for lab, path in files:
        a = load(path)
        if a is None:
            print("  missing", path)
            continue
        out = []
        for bn, bx in BOXES[name].items():
            m, sd, p5, p95, rgb = stats(a, bx)
            out.append(f"{bn}: L{m:5.1f} sd{sd:4.1f} p5 {p5:5.1f} p95 {p95:5.1f} rgb {rgb[0]:.0f},{rgb[1]:.0f},{rgb[2]:.0f} B-G{rgb[2]-rgb[1]:+.0f} "
                       f"lap{lap(a, bx):4.1f} dog{dog(a, bx):4.1f} lf{lf(a, bx):4.1f}")
        print(f"  {lab:6s} " + "\n         ".join(out))
        if name == "q00_rest":
            row = L(a[383:388, 540:620]).mean(0)
            i = int(np.argmin(row))
            rowR = L(a[383:388, 840:920]).mean(0)
            j = int(np.argmin(rowR))
            print(f"         row385 left min L{row[i]:.0f} at x{540+i}  right min L{rowR[j]:.0f} at x{840+j}")
        if name == "q03_eye":
            for y in (300, 340):
                seg = a[y, 850:895]
                ll = L(seg)
                print(f"         row{y} x850-894 L: " + " ".join(f"{v:.0f}" for v in ll[::2]))
                print(f"                B-G:  " + " ".join(f"{v:+.0f}" for v in (seg[::2, 2] - seg[::2, 1])))
        if name == "p06_sustain":
            l = L(a)
            clip = (l > 250).copy()
            clip[300:500, 600:840] = False  # the orb disc
            print(f"         clipped px outside the orb box: {int(clip.sum())}  sat(band) {sat(box(a, 520, 960, 410, 530)):.3f}")


if __name__ == "__main__":
    labs = [x.split("=", 1) for x in sys.argv[1:]]
    for name in BOXES:
        files = [(lab, pre + name + ".png") for lab, pre in labs]
        files.append(("REF", REF + REFS[name] + ".png"))
        import os
        files = [f for f in files if os.path.exists(f[1])]
        report(name, files)
