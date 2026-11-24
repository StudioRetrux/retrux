# judge8-motion: summary of stepcnt windows: per window and threshold (>4 / >8 / >16 lv band px), sum over frames for a8 / a7 / g0 /
# base, max per-frame (a8 - a7), frames where a8 > base (and by how much), and the grad2 step max |d grad2| per frame (snap check).
import re, sys
f = sys.argv[1]
wins, cur = [], None
for line in open(f):
    if line.startswith("k "):
        cur = []; wins.append(cur); continue
    m = re.match(r"\s*(\d+)\s+(\d+)\s*(\w*)\|(.*)", line)
    if not m or cur is None: continue
    k = int(m.group(1)); parts = m.group(4).split("|")
    vals = []
    for p in parts[:4]:
        nums = re.findall(r"-?\d+\.?\d*", p)
        vals.append([float(x) for x in nums[:4]])
    cur.append((k, m.group(3), vals))
names = ["a8", "a7", "g0", "base"]
for w in wins:
    if not w: continue
    k0, k1 = w[0][0], w[-1][0]
    out = [f"k{k0}-{k1}:"]
    for ti, t in enumerate([">4", ">8", ">16"]):
        sums = [sum(r[2][v][ti] for r in w) for v in range(4)]
        dmax = max(w, key=lambda r: r[2][0][ti] - r[2][1][ti]); dd = dmax[2][0][ti] - dmax[2][1][ti]
        over = [(r[0], int(r[2][0][ti] - r[2][3][ti])) for r in w if r[2][0][ti] > r[2][3][ti]]
        out.append(f"{t}: sum a8 {sums[0]:.0f} a7 {sums[1]:.0f} g0 {sums[2]:.0f} base {sums[3]:.0f}; max(a8-a7) {dd:+.0f}@k{dmax[0]}; a8>base on {len(over)} f {over[:4]}")
    g = [r[2][0][3] for r in w]; g7 = [r[2][1][3] for r in w]
    dg = max(abs(g[i] - g[i-1]) for i in range(1, len(g))) if len(g) > 1 else 0
    dg7 = max(abs(g7[i] - g7[i-1]) for i in range(1, len(g7))) if len(g7) > 1 else 0
    out.append(f"grad2 a8 {g[0]:.1f}->{g[-1]:.1f} max step {dg:.1f} (a7 {dg7:.1f}); max |a8-a7| grad2 {max(abs(a-b) for a, b in zip(g, g7)):.1f}")
    print("\n   ".join(out))
