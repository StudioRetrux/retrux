# luma (Rec.709) mean + mean rgb + B-R of boxes in images: box.py "x0,y0,x1,y1;..." img...
import sys, numpy as np, OpenImageIO as oiio
boxes = [tuple(map(int, b.split(","))) for b in sys.argv[1].split(";")]
for p in sys.argv[2:]:
    a = np.asarray(oiio.ImageBuf(p).get_pixels(oiio.FLOAT))[:, :, :3] * 255.0
    out = []
    for (x0, y0, x1, y1) in boxes:
        c = a[y0:y1, x0:x1].reshape(-1, 3)
        L = c @ np.array([0.2126, 0.7152, 0.0722])
        m = c.mean(0)
        out.append(f"L {L.mean():6.1f} p99 {np.percentile(L,99):5.1f} rgb {m[0]:5.1f},{m[1]:5.1f},{m[2]:5.1f} B-R {m[2]-m[0]:4.1f}")
    print(f"{p.split('/')[-1]:22s} | " + " | ".join(out))
