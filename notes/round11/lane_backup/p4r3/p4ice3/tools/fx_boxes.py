# fixer: the judge_p4ice findings' own boxes on capture sets (BPY python -I). Usage: fx_boxes.py label=dir ...
import sys, numpy as np, OpenImageIO as oiio
REF = "/Users/muhamadrifaldi/RetruxR11Work/hp/reference/"


def load(p):
    return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0


def L(a):
    return a @ np.array([0.2126, 0.7152, 0.0722])


def lap(l):
    q = 4 * l[1:-1, 1:-1] - l[:-2, 1:-1] - l[2:, 1:-1] - l[1:-1, :-2] - l[1:-1, 2:]
    return np.abs(q).mean()


def box(a, x0, x1, y0, y1):
    c = a[y0:y1, x0:x1]
    l = L(c)
    return f"L{l.mean():5.1f} sd{l.std():4.1f} B-G{(c[..., 2] - c[..., 1]).mean():+5.1f} lap{lap(L(a[y0 - 1:y1 + 1, x0 - 1:x1 + 1])):4.1f}"


SETS = [x.split("=", 1) for x in sys.argv[1:]]
CHECKS = [
    ("F1 p05 right arc x880-1070 y155-545", "p05_expand", "ref_F402", (880, 1070, 155, 545)),
    ("F1 p05 top arc x640-880 y50-150", "p05_expand", "ref_F402", (640, 880, 50, 150)),
    ("F3 q03 x800-830 y260-350", "q03_eye", "loop_F045", (800, 830, 260, 350)),
    ("F3 q03 x790-840 y230-330", "q03_eye", "loop_F045", (790, 840, 230, 330)),
    ("F3 q03 x820-860 y300-380", "q03_eye", "loop_F045", (820, 860, 300, 380)),
    ("F4 p06 lower strip x520-960 y470-530", "p06_sustain", "ref_F420", (520, 960, 470, 530)),
    ("F5 p04 log x680-880 y330-390", "p04_expand_pop", "ref_F358", (680, 880, 330, 390)),
]
for title, pose, ref, bx in CHECKS:
    print("==", title)
    for lab, d in SETS + [("REF", None)]:
        p = REF + ref + ".png" if d is None else f"{d}/{pose}.png"
        try:
            a = load(p)
        except Exception as e:
            print("  ", lab, "missing", p)
            continue
        print(f"   {lab:6s} {box(a, *bx)}")
print("== F4 p06 clipped px (max RGB >= 254) outside the orb box x600-840 y300-500, in x520-960 y300-540")
for lab, d in SETS + [("REF", None)]:
    p = REF + "ref_F420.png" if d is None else f"{d}/p06_sustain.png"
    a = load(p)
    m = a.max(-1) >= 254
    m[300:500, 600:840] = False
    print(f"   {lab:6s} {int(m[300:540, 520:960].sum())}")
