# AA8 polish knee study: G1 / L4 cells per knee from crawl_<path>.json (seqs BASE / FIX / A6 / K06..K09 / K10 / GT, NEW masks).
# Gates (the motion judge's g1tab7.py): MC32 reduction vs BASE >= 50 % slow / medium, >= 40 % fast / diag / reverse / leave, per box
# and total; FS on the four fast paths (L9): >= min(40, GT's own FS reduction - 5). L4: J32 / J48 reduction >= GT's - 5 points.
# Margin = (lane's reduction) - (bar), in points; L11 needs >= 1 on every cell. FS MCE <= FIX's (reported).
#   python3 g1k.py WORK [lanes...]
import json, sys, os
W = sys.argv[1]
lanes = sys.argv[2:] or ["A6", "K06", "K07", "K08", "K09", "K10"]
thr = {"slow": 50, "medium": 50, "fast": 40, "diag": 40, "reverse": 40, "leave": 40}
pct = lambda x, y: 100.0 * (y - x) / x if x else float("nan")
rows = []  # (path, cell, {lane: margin}, {lane: value}, bar)
mce = []
for p in ["slow", "medium", "reverse", "fast", "diag", "leave"]:
    f = f"{W}/ana/crawl_{p}.json"
    if not os.path.exists(f):
        print(f"{p}: missing"); continue
    s = json.load(open(f))["summary"]
    B, G, F = s["BASE"], s["GT"], s.get("FIX")
    for box in ["FS", "WR", "DR", "FF", "FR", "RS", "tot"]:
        sel = lambda x: x["tot"] if box == "tot" else x["box"][box]
        b, g = sel(B), sel(G)
        mg = pct(b["mc32"], g["mc32"])
        gate = thr[p]
        if box == "FS" and p not in ("slow", "medium"): gate = min(40, -mg - 5)
        vals = {l: pct(b["mc32"], sel(s[l])["mc32"]) for l in lanes}
        rows.append((p, f"{box} MC32", {l: -v - gate for l, v in vals.items()}, vals, -gate, mg))
        for j in ("j32", "j48"):
            jg = pct(b[j], g[j])
            vals = {l: pct(b[j], sel(s[l])[j]) for l in lanes}
            rows.append((p, f"{box} {j.upper()}", {l: -v - (-jg - 5) for l, v in vals.items()}, vals, jg + 5, jg))
        if box == "FS" and F:
            mce.append((p, {l: sel(s[l])["mce"] for l in lanes}, sel(F)["mce"], g["mce"]))
decisive = lambda p, c: p in ("slow", "medium", "reverse") or c == "FS MC32"
print("cell (path box metric) | bar (GT) | lane reduction % [margin points] ...  ('!' margin < 1, 'X' fails the bar)")
for (p, c, m, v, bar, gt) in rows:
    tag = "" if decisive(p, c) else "  (info: not an L11 cell of the brief)"
    print(f"{p:7s} {c:9s} | bar {bar:+6.1f} (GT {gt:+6.1f}) | " + "  ".join(f"{l} {v[l]:+6.1f} [{m[l]:+5.1f}]{'X' if m[l] < 0 else ('!' if m[l] < 1 else ' ')}" for l in lanes) + tag)
print()
for scope in ("L11 cells (slow / medium / reverse all boxes + FS L9 on fast / diag / leave)", "all cells on all six paths"):
    print(scope)
    for l in lanes:
        sel = [r for r in rows if scope.startswith("all") or decisive(r[0], r[1])]
        worst = min(sel, key=lambda r: r[2][l])
        nfail = sum(1 for r in sel if r[2][l] < 0); nlow = sum(1 for r in sel if 0 <= r[2][l] < 1)
        print(f"  {l}: cells {len(sel)}, fail {nfail}, margin < 1: {nlow}; worst {worst[0]} {worst[1]} margin {worst[2][l]:+.2f} (value {worst[3][l]:+.2f}, bar {worst[4]:+.1f})")
print()
print("FS MCE vs fixed AA3 (must not be worse):")
for (p, v, fx, g) in mce:
    print(f"  {p:7s} FIX {fx:.3f} GT {g:.3f} | " + "  ".join(f"{l} {v[l]:.3f}{'X' if v[l] > fx else ''}" for l in lanes))
