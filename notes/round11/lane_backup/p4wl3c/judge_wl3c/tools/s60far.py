# judge: 60 fps sparkle in the far-slab water (clip origin 860,420): 1-frame blips |dL|>T in/out, per frame; boxes in frame coords
import sys, glob, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import load, luma
T = 10.0; cx, cy = 860, 420
boxes = {'farwater': (880, 460, 1440, 600), 'lips': (880, 440, 1440, 500)}
for run in sys.argv[2:]:
    fs = sorted(glob.glob(run + '/s*.png')); L = np.array([luma(load(f)) for f in fs]).astype(np.float32)
    o = [f"{run.split('/')[-1]:16s} n={len(fs)} {L.shape[1:]}"]
    for k, (x0, y0, x1, y1) in boxes.items():
        s = L[:, y0 - cy:y1 - cy, x0 - cx:x1 - cx]; d = np.diff(s, axis=0)
        b = ((np.abs(d[:-1]) > T) & (np.abs(d[1:]) > T) & (np.sign(d[:-1]) != np.sign(d[1:]))).sum(axis=(1, 2))
        o.append(f"{k} blips/fr {b.mean():.1f} max {b.max()} mean|dL| {np.abs(d).mean():.3f} p99 {np.percentile(np.abs(d), 99):.2f}")
    print(' | '.join(o))
