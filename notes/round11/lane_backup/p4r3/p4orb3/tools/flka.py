# temporal 1st / 2nd differences (mean |dL|) per region around the orb: disc r < 0.75 R, rim 0.75-1.02 R, ice 1.02-2.5 R.
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__) + '/rj')
from jlib import *
D = sys.argv[1]
for tag_pose in sys.argv[2:]:
    m = json.load(open(f'{D}/{tag_pose}.json')); w, h, K = m['w'], m['h'], m['K']
    fr = [luma(np.frombuffer(open(f'{D}/{tag_pose}_{k}.rgba', 'rb').read(), np.uint8).reshape(h, w, 4)[::-1, :, :3].astype(np.float32)) for k in range(K)]
    o = m['orb']; cx = o['x'] - m['x0']; cy = o['y'] - (m['H'] - m['y0'] - h); R = o['r']
    yy, xx = np.mgrid[0:h, 0:w]; rr = np.hypot(xx - cx, yy - cy)
    F = np.stack(fr); d1 = np.abs(np.diff(F, axis=0)); d2 = np.abs(F[2:] - 2 * F[1:-1] + F[:-2])
    out = []
    for nm, mk in (('disc', rr < 0.75 * R), ('rim', (rr >= 0.75 * R) & (rr < 1.02 * R)), ('ice', (rr >= 1.02 * R) & (rr < 2.5 * R))):
        out.append(f"{nm} d1 {d1[:, mk].mean():5.2f} d2 {d2[:, mk].mean():5.2f} d2/d1 {d2[:, mk].mean() / max(d1[:, mk].mean(), 1e-6):4.2f} p99|d2| {np.percentile(d2[:, mk], 99):5.1f}")
    print(f"{tag_pose:18s} " + ' | '.join(out))
