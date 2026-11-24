"""Replace the measured A / B tracks by their closed-form fits (fit_closed.py), keep C / D as measured.

usage: python make_hybrid.py <mocap_raw.json> <closed_fit.json> <out mocap_raw_hybrid.json> [rings=AB]

A and B follow constant-rate tumbles almost exactly (rms 4.5 / 6.9 deg against the 40 measured frames:
A n = Ry(90 t) Rx(180 t) n0, B n = Ry(90 t) Rx(-135 t) n0), so their measurement noise is dropped. The
model axis is written back as an ellipse measurement (theta, ratio, near) with full confidence, in the
convention of fit_mocap.py: n = (s sin th, -s cos th, r), s > 0 when the +phi end is near ('dot').
"""
import json
import math
import sys

import numpy as np


def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def measurement(n):
    n = np.asarray(n, float)
    n = n / np.linalg.norm(n)
    if n[2] < 0:
        n = -n
    r = float(min(1.0, n[2]))
    th = math.degrees(math.atan2(n[0], -n[1]))
    if th < 0:
        th += 180.0
        near = "far"
    else:
        near = "dot"
    if th >= 180.0:
        th -= 180.0
    if r > 0.985 or r < 0.015:
        near = "unknown"
    return {"theta": round(th, 2), "ratio": round(r, 4), "near": near, "conf": 1.0}


def main():
    raw = json.load(open(sys.argv[1]))
    fit = json.load(open(sys.argv[2]))
    rings = sys.argv[4] if len(sys.argv) > 4 else "AB"
    for f in raw["frames"]:
        t = int(f["frame"][3:]) * 0.1
        for ring in rings:
            m = fit[ring]
            R = rot_y(math.radians(m["wy"]) * t) @ rot_x(math.radians(m["wx"]) * t) if m.get("order", "yx") == "yx" \
                else rot_x(math.radians(m["wx"]) * t) @ rot_y(math.radians(m["wy"]) * t)
            f["rings"][ring] = measurement(R @ np.array(m["n0"]))
        f["notes"] = (f.get("notes", "") + " [" + "/".join(rings) + " from the closed-form fit]").strip()
    json.dump(raw, open(sys.argv[3], "w"), indent=1)
    print("hybrid written: %s closed-form, others measured" % rings)


if __name__ == "__main__":
    main()
