# temporal stability of the orb disc / rim / skirt in the deterministic 16-frame hold burst, lane vs off
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]
def frames(tag):
    m = json.load(open(f'{D}/{tag}_hold_meta.json')); W, H, K = m['W'], m['H'], m['K']
    return np.stack([np.frombuffer(open(f'{D}/{tag}_hold_{i:02d}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32) for i in range(K)])
A, B = frames('lane'), frames('off')
lb = luma(B[8]); ys, xs = np.nonzero(lb >= 244); cy, cx = np.median(ys), np.median(xs); R = np.sqrt((lb >= 244).sum() / np.pi)
yy, xx = np.mgrid[0:A.shape[1], 0:A.shape[2]]; rr = np.hypot(xx - cx, yy - cy)
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
cr = (((A[..., 2] - A[..., 0] >= 60) & (sat(A) > 0.3)) | ((B[..., 2] - B[..., 0] >= 60) & (sat(B) > 0.3))).any(0)
print(f'orb centre (crop) {cx:.0f},{cy:.0f} R~{R:.0f}')
for name, m in (('disc <0.9R', rr < 0.9 * R), ('rim 0.9-1.3R', (rr >= 0.9 * R) & (rr < 1.3 * R)), ('skirt 1.3-2R', (rr >= 1.3 * R) & (rr < 2 * R))):
    m = m & ~cr
    out = []
    for t, F in (('lane', A), ('off', B)):
        d2 = np.abs(F[2:] - 2 * F[1:-1] + F[:-2]).max(-1)[:, m]; d1 = np.abs(F[1:] - F[:-1]).max(-1)[:, m]
        Lm = luma(F)[:, m].mean(1)
        out.append(f'{t}: 2nd-diff {d2.mean():5.2f} (|d2|>20 {(d2>20).mean()*100:5.2f}%) 1st {d1.mean():5.2f}  mean L over frames {Lm.min():.1f}-{Lm.max():.1f}')
    print(f'{name:13s} n {m.sum():6d} | ' + ' | '.join(out))
