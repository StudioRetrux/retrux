# judge_wl2: paired summary of perfab output. python3 -I perfsum.py sweep.txt
import sys, json, re, statistics as st
P = {}; valid = set()
for ln in open(sys.argv[1]):
    m = re.match(r"^(\d+) ([AB]) (\{.*\}) load", ln)
    if m: P.setdefault(int(m.group(1)), {})[m.group(2)] = json.loads(m.group(3))
    m = re.match(r"^# pair (\d+) VALID", ln)
    if m: valid.add(int(m.group(1)))
rows = []
for k in sorted(P):
    if "A" in P[k] and "B" in P[k]:
        a, b = P[k]["A"]["med"], P[k]["B"]["med"]
        rows.append((k, a, b, b / a, k in valid, P[k]["A"].get("others"), P[k]["B"].get("others"), P[k]["A"].get("load0"), P[k]["B"].get("load1")))
for r in rows: print("pair %d A %.1f B %.1f B/A %.3f %s others %s/%s load %s..%s" % (r[0], r[1], r[2], r[3], "VALID" if r[4] else "invalid", r[5], r[6], r[7], r[8]))
V = [r for r in rows if r[4]]
if V:
    q = sorted(r[3] for r in V); A = [r[1] for r in V]; B = [r[2] for r in V]
    print("valid %d | paired median B/A %.3f (lower %.3f upper %.3f) mean %.3f | A med %.1f B med %.1f" % (len(V), st.median(q), q[(len(q) - 1) // 2], q[len(q) // 2], st.mean(q), st.median(A), st.median(B)))
    for nm, X in (("A", A), ("B", B)):
        lo = [x for x in X if x < 20.8]; hi = [x for x in X if x >= 20.8]
        print("  %s modes (split 20.8 ms): low %s (n %d) | high %s (n %d)" % (nm, "%.1f" % st.median(lo) if lo else "-", len(lo), "%.1f" % st.median(hi) if hi else "-", len(hi)))
