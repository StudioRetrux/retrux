# dark-dash finder: pixels in the bottom band darker than a luma threshold AND more saturated (B-R) than a limit; connected runs
import sys, numpy as np, OpenImageIO as oiio
def load(p):
    a = np.asarray(oiio.ImageBuf(p).get_pixels(oiio.FLOAT))[:, :, :3] * 255.0
    return a
y0, y1, thr = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3])
for p in sys.argv[4:]:
    a = load(p)[y0:y1]
    L = a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
    m = L < thr
    n = int(m.sum())
    # simple 4-connected components
    lab = np.zeros(m.shape, int); cur = 0; sizes = []; boxes = []
    H, W = m.shape
    for yy in range(H):
        for xx in range(W):
            if m[yy, xx] and not lab[yy, xx]:
                cur += 1; st = [(yy, xx)]; lab[yy, xx] = cur; s = 0; bx = [xx, yy, xx, yy]; cols = []
                while st:
                    cy, cx = st.pop(); s += 1; cols.append(a[cy, cx])
                    bx = [min(bx[0], cx), min(bx[1], cy), max(bx[2], cx), max(bx[3], cy)]
                    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = cur; st.append((ny, nx))
                sizes.append(s); boxes.append((bx, np.mean(cols, 0)))
    big = sorted([(s, b) for s, b in zip(sizes, boxes) if s >= 20], key=lambda t: -t[0])[:8]
    print(f"{p.split('/')[-2]+'/'+p.split('/')[-1]:40s} px<{thr:.0f}: {n:6d}  comps>=20px: {sum(1 for s in sizes if s>=20):3d}  " + " | ".join(f"{s}px x{b[0][0]}-{b[0][2]} y{b[0][1]+y0}-{b[0][3]+y0} rgb{tuple(int(v) for v in b[1])}" for s, b in big[:5]))
