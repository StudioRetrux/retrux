# AA8 polish: the knee table (L11 decision data) from crawl_<path>.json (via g1k's rules), j48loc_slow_WR.txt (exact events),
# kerr_{medium,rest}.txt (GT errors) and popnew_<path>.txt (new pops vs AA6).   python3 kneetab.py WORK
import json, sys, re, os
W = sys.argv[1]
L = ["A6", "K06", "K07", "K08", "K09", "K10"]
NAME = {"A6": "0.5 (AA6)", "K06": "0.6", "K07": "0.7", "K08": "0.8", "K09": "0.9", "K10": "1.0 (AA7)"}
thr = {"slow": 50, "medium": 50, "fast": 40, "diag": 40, "reverse": 40, "leave": 40}
pct = lambda x, y: 100.0 * (y - x) / x
cells = []
for p in ["slow", "medium", "reverse", "fast", "diag", "leave"]:
    s = json.load(open(f"{W}/ana/crawl_{p}.json"))["summary"]
    B, G = s["BASE"], s["GT"]
    for box in ["FS", "WR", "DR", "FF", "FR", "RS", "tot"]:
        sel = lambda x: x["tot"] if box == "tot" else x["box"][box]
        b, g = sel(B), sel(G)
        mg = pct(b["mc32"], g["mc32"]); gate = thr[p]
        if box == "FS" and p not in ("slow", "medium"): gate = min(40, -mg - 5)
        l11 = p in ("slow", "medium", "reverse") or box == "FS"
        cells.append((p, box, "MC32", -gate, {l: pct(b["mc32"], sel(s[l])["mc32"]) for l in L}, l11))
        for j in ("j32", "j48"):
            jg = pct(b[j], g[j])
            cells.append((p, box, j.upper(), jg + 5, {l: pct(b[j], sel(s[l])[j]) for l in L}, l11 and p in ("slow", "medium", "reverse")))
# exact slow WR J48 from j48loc (replaces the 2-decimal per-1000 crawl value)
t = open(f"{W}/ana/j48loc_slow_WR.txt").readline()
tot = json.loads(re.search(r"totals (\{.*?\})", t).group(1))
gtx = pct(tot["BASE"], tot["GT"]); barx = gtx + 5
for i, c in enumerate(cells):
    if c[0] == "slow" and c[1] == "WR" and c[2] == "J48":
        cells[i] = (c[0], c[1], c[2], barx, {l: pct(tot["BASE"], tot[l]) for l in L}, c[5])
marg = lambda c, l: c[3] - c[4][l]  # bar (negative %) minus value: >= 0 passes, points of margin
print("KNEE TABLE (AA8 L11). Values = reduction vs BASE in %; margin = points inside the bar (G1 MC32 bar = gate, L4 bar = GT's J reduction + 5).")
print(f"{'K':10s} " + " ".join(f"{NAME[l]:>11s}" for l in L))
def row(lbl, vals): print(f"{lbl:10s} " + " ".join(f"{v:>11s}" for v in vals))
sw = [c for c in cells if c[0] == "slow" and c[1] == "WR" and c[2] == "J48"][0]
row("slowWRJ48", [f"{tot[l]}ev {sw[4][l]:+.2f}" for l in L])
print(f"  (bar {sw[3]:+.2f} % = GT {tot['GT']} ev {gtx:+.2f} % + 5; BASE {tot['BASE']} ev)")
row("  margin", [f"{marg(sw, l):+.2f}" for l in L])
for scope, f in (("L11 cells", lambda c: c[5]), ("all cells", lambda c: True)):
    sel = [c for c in cells if f(c)]
    row(f"{scope[:9]}", [f"n{len(sel)} f{sum(marg(c, l) < 0 for c in sel)} <1:{sum(0 <= marg(c, l) < 1 for c in sel)}" for l in L])
    def worst2(l):
        o = sorted(sel, key=lambda c: marg(c, l))
        return o[1]
    row("  2nd-worst", [f"{worst2(l)[0][:4]}{worst2(l)[1]}{worst2(l)[2][:2]}{marg(worst2(l), l):+.1f}" for l in L])
for (p, box, m) in [("fast", "FS", "MC32"), ("diag", "FS", "MC32"), ("leave", "FS", "MC32"), ("reverse", "FS", "MC32"), ("slow", "FS", "J48"), ("slow", "RS", "J48")]:
    c = [c for c in cells if c[0] == p and c[1] == box and c[2] == m][0]
    row(f"{p[:4]}{box}{m}", [f"{c[4][l]:+.1f}[{marg(c, l):+.1f}]" for l in L])
    print(f"  (bar {c[3]:+.1f})")
K = {}
for p in ("medium", "rest"):
    for line in open(f"{W}/ana/kerr_{p}.txt"):
        d = json.loads(line); K[(p, d["lane"])] = d
print("GT error, mean |lane - GT| (luma lv) on GT thin-dark px: thinDark = off lake / band / hero (jgt2's set), wlLines = on the waterline band")
for p in ("medium", "rest"):
    row(f"thin {p[:3]}", [f"{K[(p, l)]['thinDark']['meanAbs']:.4f}" for l in L])
    row(f"wl   {p[:3]}", [f"{K[(p, l)]['wlLines']['meanAbs']:.4f}" for l in L])
sums = {l: sum(K[(p, l)][k]["meanAbs"] for p in ("medium", "rest") for k in ("thinDark", "wlLines")) for l in L}
row("SUM", [f"{sums[l]:.4f}" for l in L])
tw = {l: sum(K[(p, l)][k]["meanAbs"] * K[(p, l)][k]["n"] for p in ("medium", "rest") for k in ("thinDark", "wlLines")) / sum(K[(p, l)][k]["n"] for p in ("medium", "rest") for k in ("thinDark", "wlLines")) for l in L}
row("px-weighted", [f"{tw[l]:.4f}" for l in L])
row("wl sgn med", [f"{K[('medium', l)]['wlLines']['meanSigned']:+.3f}" for l in L])
row("wl sgn rest", [f"{K[('rest', l)]['wlLines']['meanSigned']:+.3f}" for l in L])
row("AR2 ob12 m", [f"{K[('medium', l)]['wlLines']['overBright12']}" for l in L])
row("jgt2 out m", [f"{K[('medium', l)]['jgt2OutsideBase3x3']}" for l in L])
row("jgt2 out r", [f"{K[('rest', l)]['jgt2OutsideBase3x3']}" for l in L])
print(f"  (BASE: thin med {K[('medium', 'BASE')]['thinDark']['meanAbs']:.4f} rest {K[('rest', 'BASE')]['thinDark']['meanAbs']:.4f}; wl med {K[('medium', 'BASE')]['wlLines']['meanAbs']:.4f} rest {K[('rest', 'BASE')]['wlLines']['meanAbs']:.4f}; wl signed med {K[('medium', 'BASE')]['wlLines']['meanSigned']:+.3f})")
pn = {}
for p in ["slow", "medium", "reverse", "fast", "diag", "leave"]:
    f = f"{W}/ana/popnew_{p}.txt"
    if not os.path.exists(f): continue
    for line in open(f):
        m = re.match(r"-- (\w+) (K\d\d) vs A6: new pops .*?: (\d+) px, (\d+) clusters, >= 6 px: (\d+)", line)
        if m: pn[(p, m.group(2))] = (int(m.group(3)), int(m.group(5)))
row("popnew vsA6", ["-"] + [f"{sum(pn.get((p, l), (0, 0))[0] for p in ['slow', 'medium', 'reverse', 'fast', 'diag', 'leave'])}px/{sum(pn.get((p, l), (0, 0))[1] for p in ['slow', 'medium', 'reverse', 'fast', 'diag', 'leave'])}cl6" for l in L[1:]])
print("  per path (px): " + "; ".join(f"{p} " + "/".join(str(pn.get((p, l), ('?',))[0]) for l in L[1:]) for p in ["slow", "medium", "reverse", "fast", "diag", "leave"]))
passing = [l for l in L[1:] if all(marg(c, l) >= 1 for c in cells if c[5])]
print("L11: K passing every L11 cell with >= 1 point:", [NAME[l] for l in passing], "| lowest summed GT error among them:", NAME[min(passing, key=lambda l: sums[l])] if passing else "none -> keep 1.0")
