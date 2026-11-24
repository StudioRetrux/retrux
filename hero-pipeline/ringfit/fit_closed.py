"""Fit a closed-form constant-rate tumble to each ring's measured axis track (Default Loop, 40 frames).

usage: python fit_closed.py <mocap_raw.json> <out.json>

Model per ring (camera space ~ world space at the rest camera):  n(t) = Ry(wy t) Rx(wx t) n0
with wy, wx multiples of 45 deg/s (so the 4 s loop closes exactly: every axis turns a whole number of half
turns) and n0 a unit vector. Measurement j gives the axis up to the overall sign and, unless 'near' is
reported, up to the sign of its in-plane part: candidates (+-s sin th, -+s cos th, r), s = sqrt(1 - r^2).
Cost = sum over frames of conf * angle^2 to the nearest candidate (+ a penalty when a confident 'near'
contradicts the model). Also tries Rx(wx t) Ry(wy t) n0 and reports the best of both orders.
"""
import json
import math
import sys

import numpy as np

STEP = 0.1


def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    o, z = np.ones_like(a), np.zeros_like(a)
    return np.stack([np.stack([o, z, z], -1), np.stack([z, c, -s], -1), np.stack([z, s, c], -1)], -2)


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    o, z = np.ones_like(a), np.zeros_like(a)
    return np.stack([np.stack([c, z, s], -1), np.stack([z, o, z], -1), np.stack([-s, z, c], -1)], -2)


def candidates(m):
    """Measured axis candidates (k x 3) and a weight for the 'near'-consistent ones."""
    th = math.radians(m["theta"])
    r = max(0.0, min(1.0, m["ratio"]))
    s = math.sqrt(max(0.0, 1.0 - r * r))
    plus = np.array([s * math.sin(th), -s * math.cos(th), r])
    minus = np.array([-s * math.sin(th), s * math.cos(th), r])
    near = m.get("near", "unknown")
    return plus, minus, near


def sphere_grid(step_deg=2.0):
    pts = []
    for el in np.arange(-90.0, 90.0 + 1e-6, step_deg):
        n = max(1, int(round(360.0 * math.cos(math.radians(el)) / step_deg)))
        for k in range(n):
            az = 360.0 * k / n
            e, a = math.radians(el), math.radians(az)
            pts.append([math.cos(e) * math.cos(a), math.sin(e), math.cos(e) * math.sin(a)])
    return np.array(pts)


def fit_ring(frames, ring, grid, rates, order):
    ts = np.array([int(f["frame"][3:]) * STEP for f in frames])
    plus = np.array([candidates(f["rings"][ring])[0] for f in frames])
    minus = np.array([candidates(f["rings"][ring])[1] for f in frames])
    near = [candidates(f["rings"][ring])[2] for f in frames]
    conf = np.array([max(0.1, f["rings"][ring].get("conf", 0.5)) for f in frames])
    best = None
    for wy in rates:
        for wx in rates:
            Ry = rot_y(np.radians(wy) * ts)          # (F,3,3)
            Rx = rot_x(np.radians(wx) * ts)
            M = Ry @ Rx if order == "yx" else Rx @ Ry  # (F,3,3)
            pred = np.einsum("fij,gj->fgi", M, grid)  # (F,G,3)
            # Axis sign is free: |dot|. In-plane sign: the measured candidate nearest to the prediction, but a
            # confident 'near' report fixes it (dot: +s ... 'plus'; far: 'minus').
            dp = np.abs(np.einsum("fgi,fi->fg", pred, plus))
            dm = np.abs(np.einsum("fgi,fi->fg", pred, minus))
            d = np.maximum(dp, dm)
            for j, nr in enumerate(near):
                if nr == "dot":
                    d[j] = 0.6 * dp[j] + 0.4 * d[j]
                elif nr == "far":
                    d[j] = 0.6 * dm[j] + 0.4 * d[j]
            ang = np.arccos(np.clip(d, -1.0, 1.0))      # (F,G)
            cost = (conf[:, None] * ang ** 2).sum(0) / conf.sum()
            g = int(np.argmin(cost))
            if best is None or cost[g] < best[0]:
                best = (float(cost[g]), wy, wx, grid[g].copy(), np.degrees(ang[:, g]))
    return best


def main():
    data = json.load(open(sys.argv[1]))
    frames = sorted(data["frames"], key=lambda f: int(f["frame"][3:]))
    grid = sphere_grid(2.0)
    rates = [45.0 * k for k in range(-6, 7)]
    out = {}
    for ring in "ABCD":
        res = []
        for order in ("yx", "xy"):
            c, wy, wx, n0, per = fit_ring(frames, ring, grid, rates, order)
            res.append((c, order, wy, wx, n0, per))
        res.sort(key=lambda r: r[0])
        c, order, wy, wx, n0, per = res[0]
        alt = res[1]
        rms = math.degrees(math.sqrt(c))
        print("%s: order %s  wy %+.0f  wx %+.0f deg/s  n0 (%.3f, %.3f, %.3f)  weighted rms %.1f deg  median %.1f  max %.1f  (other order rms %.1f: %s wy %+.0f wx %+.0f)"
              % (ring, order, wy, wx, n0[0], n0[1], n0[2], rms, float(np.median(per)), float(per.max()), math.degrees(math.sqrt(alt[0])), alt[1], alt[2], alt[3]))
        worst = np.argsort(per)[::-1][:4]
        print("    worst frames:", ", ".join("%s %.0f" % (frames[i]["frame"], per[i]) for i in worst))
        out[ring] = {"order": order, "wy": wy, "wx": wx, "n0": n0.tolist(), "rms_deg": rms, "per_frame_deg": per.tolist()}
    json.dump(out, open(sys.argv[2], "w"), indent=1)


def rot_z(a):
    c, s = np.cos(a), np.sin(a)
    o, z = np.ones_like(a), np.zeros_like(a)
    return np.stack([np.stack([c, -s, z], -1), np.stack([s, c, z], -1), np.stack([z, z, o], -1)], -2)


def fit_ring3(frames, ring, grid, parents, rates):
    """n(t) = Ry(a t) R1(b t) R2(c t) n0 with (R1, R2) = (Rx, Rz) or (Rz, Rx): a nested-gimbal family."""
    ts = np.array([int(f["frame"][3:]) * STEP for f in frames])
    plus = np.array([candidates(f["rings"][ring])[0] for f in frames])
    minus = np.array([candidates(f["rings"][ring])[1] for f in frames])
    near = [candidates(f["rings"][ring])[2] for f in frames]
    conf = np.array([max(0.1, f["rings"][ring].get("conf", 0.5)) for f in frames])
    best = None
    for order in ("xz", "zx"):
        for a in parents:
            Ry = rot_y(np.radians(a) * ts)
            for b in rates:
                Rx = rot_x(np.radians(b) * ts)
                for c in rates:
                    Rz = rot_z(np.radians(c) * ts)
                    M = Ry @ (Rx @ Rz if order == "xz" else Rz @ Rx)
                    pred = np.einsum("fij,gj->fgi", M, grid)
                    dp = np.abs(np.einsum("fgi,fi->fg", pred, plus))
                    dm = np.abs(np.einsum("fgi,fi->fg", pred, minus))
                    d = np.maximum(dp, dm)
                    for j, nr in enumerate(near):
                        if nr == "dot":
                            d[j] = 0.6 * dp[j] + 0.4 * d[j]
                        elif nr == "far":
                            d[j] = 0.6 * dm[j] + 0.4 * d[j]
                    ang = np.arccos(np.clip(d, -1.0, 1.0))
                    cost = (conf[:, None] * ang ** 2).sum(0) / conf.sum()
                    g = int(np.argmin(cost))
                    if best is None or cost[g] < best[0]:
                        best = (float(cost[g]), order, a, b, c, grid[g].copy(), np.degrees(ang[:, g]))
    return best


def main3():
    data = json.load(open(sys.argv[2]))
    frames = sorted(data["frames"], key=lambda f: int(f["frame"][3:]))
    grid = sphere_grid(3.0)
    rates = [45.0 * k for k in range(-6, 7)]
    parents = [-90.0, 0.0, 90.0]
    out = {}
    for ring in sys.argv[4]:
        c, order, a, b, cc, n0, per = fit_ring3(frames, ring, grid, parents, rates)
        rms = math.degrees(math.sqrt(c))
        print("%s: Ry(%+.0f t) R%s  b %+.0f  c %+.0f deg/s  n0 (%.3f, %.3f, %.3f)  weighted rms %.1f deg  median %.1f  max %.1f"
              % (ring, a, order, b, cc, n0[0], n0[1], n0[2], rms, float(np.median(per)), float(per.max())))
        worst = np.argsort(per)[::-1][:5]
        print("    worst frames:", ", ".join("%s %.0f" % (frames[i]["frame"], per[i]) for i in worst))
        out[ring] = {"model": "Ry R%s" % order, "a": a, "b": b, "c": cc, "n0": n0.tolist(), "rms_deg": rms, "per_frame_deg": per.tolist()}
    json.dump(out, open(sys.argv[3], "w"), indent=1)

if __name__ == "__main__":
    if sys.argv[1] == "--nested":
        main3()
    else:
        main()
