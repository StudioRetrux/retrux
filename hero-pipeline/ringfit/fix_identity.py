"""Resolve ring C / D identity swaps between measurement chunks before fit_mocap.py.

usage: python fix_identity.py <mocap_raw.json> <out.json> [swap penalty deg = 12]

Each chunk of consecutive frames was measured by a different agent. The two inner rings (C radius 121 px,
D 97 px) can be mislabelled consistently within a chunk when one of them is hidden or edge-on. For every
chunk this picks "as measured" or "C and D swapped" so that the summed frame-to-frame axis change of C and D
over the whole (looping) sequence is smallest (dynamic programming over the chunks).
"""
import json
import math
import sys


def axes(theta, ratio):
    """Both axis directions (camera space) a projected ellipse allows (the near sign is ambiguous)."""
    t = math.radians(theta)
    r = max(0.0, min(1.0, ratio))
    s = math.sqrt(max(0.0, 1.0 - r * r))
    return [(s * math.sin(t), -s * math.cos(t), r), (-s * math.sin(t), s * math.cos(t), r)]


def angle(m1, m2):
    best = math.pi
    for a in axes(m1["theta"], m1["ratio"]):
        for b in axes(m2["theta"], m2["ratio"]):
            d = max(-1.0, min(1.0, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
            best = min(best, math.acos(abs(d)) if False else math.acos(d))
    return best


def step_cost(f1, f2, swap1, swap2):
    c1, d1 = (f1["rings"]["D"], f1["rings"]["C"]) if swap1 else (f1["rings"]["C"], f1["rings"]["D"])
    c2, d2 = (f2["rings"]["D"], f2["rings"]["C"]) if swap2 else (f2["rings"]["C"], f2["rings"]["D"])
    return angle(c1, c2) + angle(d1, d2)


def main():
    data = json.load(open(sys.argv[1]))
    frames = sorted(data["frames"], key=lambda f: int(f["frame"][3:]))
    # Swapping labels between two consecutive frames costs this much (rad): labels are usually right, so a
    # swap must buy at least this much continuity. Frame-level, as one agent can also flip C / D mid-chunk.
    penalty = math.radians(float(sys.argv[3]) if len(sys.argv) > 3 else 12.0)
    n = len(frames)
    best_total, best_states = None, None
    for s0 in (False, True):
        cost = {s0: 0.0}
        back = []
        for i in range(1, n):
            ncost, nback = {}, {}
            for s in (False, True):
                opts = [(cost[p] + step_cost(frames[i - 1], frames[i], p, s) + (penalty if p != s else 0.0), p) for p in cost]
                c, p = min(opts)
                ncost[s], nback[s] = c, p
            cost = ncost
            back.append(nback)
        # Close the loop (t = 4 s is t = 0) with the first frame's state.
        for s in cost:
            total = cost[s] + step_cost(frames[-1], frames[0], s, s0) + (penalty if s != s0 else 0.0)
            if best_total is None or total < best_total:
                states = [s]
                for i in range(n - 2, -1, -1):
                    states.append(back[i][states[-1]])
                states.reverse()
                best_total, best_states = total, states
    # Prefer the labelling where most frames keep their measured labels.
    if sum(best_states) > n / 2:
        best_states = [not s for s in best_states]
    plain = sum(step_cost(frames[i - 1], frames[i], False, False) for i in range(1, n)) + step_cost(frames[-1], frames[0], False, False)
    swapped = [frames[i]["frame"] for i in range(n) if best_states[i]]
    for i in range(n):
        if best_states[i]:
            r = frames[i]["rings"]
            r["C"], r["D"] = r["D"], r["C"]
            frames[i]["notes"] = (frames[i].get("notes", "") + " [C/D swapped by fix_identity]").strip()
    resolved = sum(step_cost(frames[i - 1], frames[i], False, False) for i in range(1, n)) + step_cost(frames[-1], frames[0], False, False)
    print("C+D path length (deg): as measured %.0f, resolved %.0f" % (math.degrees(plain), math.degrees(resolved)))
    print("swapped frames:", swapped or "none")
    worst = sorted(((math.degrees(angle(frames[i - 1]["rings"][k], frames[i]["rings"][k])), frames[i - 1]["frame"], frames[i]["frame"], k) for i in range(1, n) for k in "CD"), reverse=True)[:6]
    for w in worst:
        print("  largest step %s: %s -> %s %.0f deg" % (w[3], w[1], w[2], w[0]))
    json.dump({"frames": frames}, open(sys.argv[2], "w"), indent=1)

if __name__ == "__main__":
    main()
