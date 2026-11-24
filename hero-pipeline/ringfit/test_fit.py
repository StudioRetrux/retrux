"""Synthetic check of fit_mocap.py: measurements generated from the engine's tumble chains must come back."""
import json
import math
import subprocess
import sys
import os

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import fit_mocap as F  # noqa: E402

frames = []
truth = {r: [] for r in F.RINGS}
for k in range(40):
    t = k * 0.1
    phase = (t - 1.5) * (math.pi / 2)
    rings = {}
    for ring in F.RINGS:
        q = np.array([0, 0, 0, 1.0])
        for axis, rate in F.CHAINS[ring]:
            q = F.qmul(F.qaxis(axis, rate * phase), q)
        n_w = F.qrot(q, F.Z)
        truth[ring].append(n_w)
        n = np.array([np.dot(n_w, F.right), np.dot(n_w, F.up), np.dot(n_w, F.back)])
        if n[2] < 0:
            n = -n
        r = n[2]
        s = math.sqrt(max(0.0, 1 - r * r))
        if s < 1e-6:
            th = 0.0
        else:
            th = math.degrees(math.atan2(n[0], -n[1])) % 360  # n = (s sin th, -s cos th, r) with s > 0
            near = "dot"
            if th >= 180:
                th -= 180
                near = "far"
        rings[ring] = {"theta": th if s >= 1e-6 else 0.0, "ratio": r, "near": near if s >= 1e-6 else "unknown", "conf": 0.9}
    frames.append({"frame": f"lf_{k:02d}", "t": t, "rings": rings})
d = os.path.dirname(__file__)
json.dump({"frames": frames}, open(os.path.join(d, "synthetic_raw.json"), "w"))
subprocess.run([sys.executable, os.path.join(d, "fit_mocap.py"), os.path.join(d, "synthetic_raw.json"),
                os.path.join(d, "synthetic_out.json"), os.path.join(d, "synthetic_out.ts")], check=True)
out = json.load(open(os.path.join(d, "synthetic_out.json")))
for ring in F.RINGS:
    errs = []
    for k in range(40):
        q = np.array(out["rings"][ring][k * F.SUB])
        n = F.qrot(q, F.Z)
        errs.append(math.degrees(math.acos(min(1.0, abs(float(np.dot(n, truth[ring][k])))))))
    print(f"{ring}: axis error mean {np.mean(errs):.2f} deg, max {np.max(errs):.2f} deg")
