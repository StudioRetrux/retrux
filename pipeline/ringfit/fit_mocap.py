"""Turn per-frame ring ellipse measurements (Default Loop, 40 frames at 0.1 s) into smooth, looping
per-ring orientation keyframes for the three.js gyroscope.

usage: python fit_mocap.py <mocap_raw.json> <out.json> <out.ts>

Each measurement (theta = major-axis angle CCW from image-right, ratio = minor/major, near = which end of the
minor axis is nearer) gives the ring axis up to two sign choices:
    n = (s sin(theta), -s cos(theta), r) in camera space, s = +sqrt(1-r^2) if the +phi end is near, else -.
A Viterbi pass picks, frame by frame, the candidate (and overall sign) that moves least, honouring confident
'near' reports. The axis track is smoothed, converted to world space (rest camera), turned into orientations
by parallel transport from the engine's current t = 0 pose, and the residual twist at the loop end is spread
over the loop so t = 4 s returns exactly to t = 0.
"""
import json
import math
import sys

import numpy as np

YAW = math.radians(0.672220988573093)
PITCH = math.radians(-0.048456561917928444)
RINGS = "ABCD"
STEP = 0.1
N = 40
SUB = 4  # output keys every STEP / SUB = 0.025 s


# ---------- quaternions (x, y, z, w) ----------
def qmul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return np.array([
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    ])


def qaxis(axis, ang):
    axis = np.asarray(axis, float)
    axis = axis / np.linalg.norm(axis)
    s = math.sin(ang / 2)
    return np.array([axis[0] * s, axis[1] * s, axis[2] * s, math.cos(ang / 2)])


def qrot(q, v):
    x, y, z, w = q
    u = np.array([x, y, z])
    v = np.asarray(v, float)
    return v + 2 * np.cross(u, np.cross(u, v) + w * v)


def qfrom_vectors(a, b):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    d = float(np.dot(a, b))
    if d < -0.999999:
        ax = np.cross([1, 0, 0], a)
        if np.linalg.norm(ax) < 1e-6:
            ax = np.cross([0, 1, 0], a)
        return qaxis(ax, math.pi)
    c = np.cross(a, b)
    q = np.array([c[0], c[1], c[2], 1 + d])
    return q / np.linalg.norm(q)


def qnorm(q):
    return q / np.linalg.norm(q)


# ---------- engine t = 0 pose (the tumble chains in Rings.ts at tau = 0) ----------
X, Y, Z = [1, 0, 0], [0, 1, 0], [0, 0, 1]
CHAINS = {
    "A": [(Z, 1), (X, 2), (Y, 0.5)],
    "B": [(X, 4 / 3), (Y, -4 / 3)],
    "C": [(X, 3), (Y, -1)],
    "D": [(Y, -3), (X, 1)],
}


def engine_pose_t0(ring):
    phase = (0.0 - 1.5) * (math.pi / 2)
    q = np.array([0, 0, 0, 1.0])
    for axis, rate in CHAINS[ring]:
        q = qmul(qaxis(axis, rate * phase), q)
    return q


# ---------- camera -> world ----------
fwd = np.array([-math.cos(PITCH) * math.sin(YAW), math.sin(PITCH), -math.cos(PITCH) * math.cos(YAW)])
right = np.cross(fwd, [0, 1, 0])
right /= np.linalg.norm(right)
up = np.cross(right, fwd)
back = -fwd


def cam_to_world(n):
    return n[0] * right + n[1] * up + n[2] * back


def candidates(m):
    th = math.radians(m["theta"])
    r = min(1.0, max(0.0, m["ratio"]))
    s = math.sqrt(max(0.0, 1 - r * r))
    c1 = np.array([s * math.sin(th), -s * math.cos(th), r])  # +phi end near
    c2 = np.array([-s * math.sin(th), s * math.cos(th), r])  # +phi end far
    near = m.get("near", "unknown")
    conf = float(m.get("conf", 0.5))
    allowed = [c1, c2]
    if conf >= 0.4 and r < 0.92 and near == "dot":
        allowed = [c1]
    elif conf >= 0.4 and r < 0.92 and near == "far":
        allowed = [c2]
    out = []
    for c in allowed:
        out.append(c)
        out.append(-c)
    return out, conf


def angle(a, b):
    return math.acos(max(-1.0, min(1.0, float(np.dot(a, b)))))


def track(meas):
    """Viterbi over sign choices; cost = angle between consecutive axes, weighted by confidence."""
    cands = [candidates(m) for m in meas]
    n = len(cands)
    cost = [np.zeros(len(cands[0][0]))]
    back = []
    for k in range(1, n):
        ck, conf = cands[k]
        prev = cands[k - 1][0]
        w = 0.5 + conf
        row = np.zeros(len(ck))
        br = np.zeros(len(ck), int)
        for j, c in enumerate(ck):
            best, bi = 1e9, 0
            for i, p in enumerate(prev):
                v = cost[-1][i] + w * angle(p, c)
                if v < best:
                    best, bi = v, i
            row[j], br[j] = best, bi
        cost.append(row)
        back.append(br)
    # Loop closure: prefer an end state that returns towards a start state.
    j = int(np.argmin(cost[-1]))
    path = [j]
    for k in range(n - 1, 0, -1):
        j = int(back[k - 1][j])
        path.append(j)
    path.reverse()
    return [cands[k][0][path[k]] for k in range(n)], [cands[k][1] for k in range(n)]


def qlog(q):
    """log of a unit quaternion -> pure vector (half-angle * axis)."""
    v = q[:3]
    s = np.linalg.norm(v)
    a = math.atan2(s, q[3])
    return v * (a / s) if s > 1e-9 else np.zeros(3)


def qexp(v):
    a = np.linalg.norm(v)
    if a < 1e-9:
        return np.array([0, 0, 0, 1.0])
    s = math.sin(a) / a
    return np.array([v[0] * s, v[1] * s, v[2] * s, math.cos(a)])


def qinv(q):
    return np.array([-q[0], -q[1], -q[2], q[3]])


def qslerp(a, b, t):
    d = float(np.dot(a, b))
    if d < 0:
        b, d = -b, -d
    if d > 0.9995:
        return qnorm(a + (b - a) * t)
    th = math.acos(d)
    return (math.sin((1 - t) * th) * a + math.sin(t * th) * b) / math.sin(th)


def squad_upsample(keys, sub):
    """Shoemake squad through the keys (C1), `sub` samples per key interval; ends are clamped."""
    n = len(keys)
    k = [np.array(q) for q in keys]
    s = []
    for i in range(n):
        qm = k[max(i - 1, 0)]
        qp = k[min(i + 1, n - 1)]
        qi = qinv(k[i])
        s.append(qnorm(qmul(k[i], qexp(-(qlog(qmul(qi, qp)) + qlog(qmul(qi, qm))) / 4))))
    out = []
    for i in range(n - 1):
        for j in range(sub):
            t = j / sub
            a = qslerp(k[i], k[i + 1], t)
            b = qslerp(s[i], s[i + 1], t)
            out.append(qnorm(qslerp(a, b, 2 * t * (1 - t))))
    out.append(k[-1])
    for i in range(1, len(out)):
        if np.dot(out[i], out[i - 1]) < 0:
            out[i] = -out[i]
    return out


def smooth_axes(ax, conf, passes=1):
    a = [np.array(v, float) for v in ax]
    n = len(a)
    for _ in range(passes):
        b = []
        for k in range(n):
            p, c, q = a[(k - 1) % n], a[k], a[(k + 1) % n]
            # keep hemisphere continuity for the neighbours
            if np.dot(p, c) < 0:
                p = -p
            if np.dot(q, c) < 0:
                q = -q
            wc = 1.0 + conf[k]
            v = 0.5 * p + wc * c + 0.5 * q
            b.append(v / np.linalg.norm(v))
        a = b
    return a


def main():
    raw = json.load(open(sys.argv[1]))
    frames = sorted(raw["frames"], key=lambda f: f["t"])
    if len(frames) != N:
        print(f"warning: {len(frames)} frames (expected {N})")
    out = {}
    report = []
    for ring in RINGS:
        meas = [f["rings"][ring] for f in frames]
        ax_cam, conf = track(meas)
        ax_cam = smooth_axes(ax_cam, conf)
        ax = [cam_to_world(v) for v in ax_cam]
        # Orientation by parallel transport, starting from the engine's t = 0 pose turned onto the
        # measured t = 0 axis (keeps the engine's in-plane spin).
        q0 = engine_pose_t0(ring)
        n0 = qrot(q0, Z)
        if np.dot(n0, ax[0]) < 0:
            ax = [-v for v in ax]
        q = qnorm(qmul(qfrom_vectors(n0, ax[0]), q0))
        qs = [q]
        for k in range(1, len(ax)):
            q = qnorm(qmul(qfrom_vectors(ax[k - 1], ax[k]), q))
            qs.append(q)
        # Close the loop. Carry the last axis on to the first (t = 4 s == t = 0), or onto its opposite when the
        # track ends turned over (a ring turned over looks the same), then spread the remaining twist about
        # the ring's own axis (local Z, which never moves the measured axis path) over the loop.
        flipped = float(np.dot(ax[-1], ax[0])) < 0
        target = -ax[0] if flipped else ax[0]
        q_end = qnorm(qmul(qfrom_vectors(ax[-1], target), qs[-1]))
        q0 = qs[0]
        q0i = np.array([-q0[0], -q0[1], -q0[2], q0[3]])
        if flipped:
            # the pose one loop later should be q0 turned over about its local X: q0 * Rx(pi)
            goal = qmul(q0, qaxis(X, math.pi))
        else:
            goal = q0
        goali = np.array([-goal[0], -goal[1], -goal[2], goal[3]])
        r_local = qnorm(qmul(goali, q_end))  # q_end = goal * r_local, r_local ~ a twist about local Z
        if r_local[3] < 0:
            r_local = -r_local
        ang = 2 * math.acos(max(-1.0, min(1.0, r_local[3])))
        sgn = 1.0 if r_local[2] >= 0 else -1.0
        tilt_err = math.degrees(math.acos(max(-1.0, min(1.0, float(np.dot(qrot(r_local, Z), Z))))))
        n_k = len(qs)
        fixed = []
        for k, qk in enumerate(qs + [q_end]):
            corr = qaxis(Z, -sgn * ang * (k / n_k))
            fixed.append(qnorm(qmul(qk, corr)))
        # sign continuity for interpolation (41 keys: the last is t = 4 s, equal to or a turned-over t = 0)
        for k in range(1, len(fixed)):
            if np.dot(fixed[k], fixed[k - 1]) < 0:
                fixed[k] = -fixed[k]
        steps = [math.degrees(2 * math.acos(min(1.0, abs(float(np.dot(fixed[k], fixed[k + 1])))))) for k in range(len(fixed) - 1)]
        dense = squad_upsample(fixed, SUB)
        out[ring] = [[round(float(c), 5) for c in qk] for qk in dense]
        report.append(f"{ring}: twist {math.degrees(ang):.1f} deg spread, turned over at loop end: {flipped}, "
                      f"closure tilt error {tilt_err:.1f} deg, max step {max(steps):.1f} deg / 0.1 s, mean conf {np.mean(conf):.2f}")
    json.dump({"step": STEP / SUB, "rings": out}, open(sys.argv[2], "w"), indent=1)
    with open(sys.argv[3], "w") as f:
        f.write("/**\n * Ring orientations motion-captured from Default Loop.mp4 (40 frames, 0.1 s apart, 4 s loop):\n")
        f.write(" * per-frame ellipse fits -> axis track -> parallel transport -> loop closure -> squad resampling\n")
        f.write(" * (hero-pipeline/ringfit). World-space quaternions [x, y, z, w] of each ring group (geometry\n")
        f.write(" * face-on along +Z), one every RING_MOCAP_STEP s; the last key is t = 4 s (the loop point).\n */\n")
        f.write(f"export const RING_MOCAP_STEP = {STEP / SUB};\n")
        f.write("export const RING_MOCAP: Record<\"A\" | \"B\" | \"C\" | \"D\", number[][]> = ")
        f.write(json.dumps(out))
        f.write(";\n")
    print("\n".join(report))


if __name__ == "__main__":
    main()
