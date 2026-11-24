# Frame-to-frame sparkle on a 60 fps sequence (clip frames): 1-frame blips (|dL| > T into and out of a frame, opposite signs)
# and the mean |dL| per frame, in boxes given in frame coords (the clip origin is subtracted).
#   python shimmer.py <tools> "<glob>" <clipx> <clipy> [T=10]
import sys, glob, json, numpy as np
sys.path.insert(0, sys.argv[1])
from imgio import load, luma
fs = sorted(glob.glob(sys.argv[2]))
cx, cy = int(sys.argv[3]), int(sys.argv[4])
T = float(sys.argv[5]) if len(sys.argv) > 5 else 10.0
L = np.array([luma(load(f)) for f in fs])
boxes = {'zone': (440, 560, 1000, 700), 'glint': (520, 580, 880, 760), 'near': (420, 660, 1000, 740), 'rockR': (880, 690, 1080, 766), 'rockL': (370, 690, 520, 766)}
res = {'n': len(fs)}
for k, (x0, y0, x1, y1) in boxes.items():
    s = L[:, max(0, y0 - cy):y1 - cy, max(0, x0 - cx):x1 - cx]
    d = np.diff(s, axis=0)
    blip = ((np.abs(d[:-1]) > T) & (np.abs(d[1:]) > T) & (np.sign(d[:-1]) != np.sign(d[1:]))).sum(axis=(1, 2))
    res[k] = {'blips_per_frame': round(float(blip.mean()), 1), 'blips_max': int(blip.max()), 'mean_absdL': round(float(np.abs(d).mean()), 3), 'p99_absdL': round(float(np.percentile(np.abs(d), 99)), 2), 'px': int(s.shape[1] * s.shape[2])}
print(json.dumps(res))
