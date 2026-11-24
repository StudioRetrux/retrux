import sys, numpy as np, OpenImageIO as oiio
def L(p): a = oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0; return a @ np.array([0.2126, 0.7152, 0.0722]), a
a, A = L(sys.argv[1]); b, B = L(sys.argv[2])
d = np.abs(a - b)
hb = d[100:620, 380:1060]
print(f'hero box mean |dL| {hb.mean():.3f}  p99 {np.percentile(hb, 99):.1f}  px>8: {(hb > 8).mean()*100:.2f}%  px>20: {(hb > 20).mean()*100:.2f}%')
for nm, (x0, x1, y0, y1) in {'face x760-830 y365-400': (760, 830, 365, 400), 'bandR x790-860 y352-410': (790, 860, 352, 410), 'lower arcs x600-840 y440-530': (600, 840, 440, 530)}.items():
    print(f'  {nm}: {a[y0:y1, x0:x1].mean():.1f} -> {b[y0:y1, x0:x1].mean():.1f}  sd {a[y0:y1, x0:x1].std():.1f} -> {b[y0:y1, x0:x1].std():.1f}')
# where do big diffs sit (columns / rows histogram)
ys, xs = np.where(d > 20)
if len(xs):
    print('  >20 px bbox x', xs.min(), xs.max(), 'y', ys.min(), ys.max(), 'count', len(xs))
