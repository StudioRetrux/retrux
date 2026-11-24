# fixer: per pose, pixels whose luma moved > 4 levels between two capture sets, and their bounding box
import sys, numpy as np, OpenImageIO as oiio
A, B = sys.argv[1], sys.argv[2]
def L(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0 @ np.array([0.2126, 0.7152, 0.0722])
for pose in ["q00_rest", "q01_loop15", "q02_loop30", "q03_eye", "p04_expand_pop", "p05_expand", "p06_sustain", "p07_release_snap", "p08_release_home", "ui_rest"]:
    d = np.abs(L(f"{A}/{pose}.png") - L(f"{B}/{pose}.png"))
    m = d > 4
    ys, xs = np.nonzero(m)
    bb = f"x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()}" if m.any() else "-"
    print(f"{pose:18s} px>4: {int(m.sum()):6d}  mean|dL| {d.mean():.3f}  bbox {bb}")
