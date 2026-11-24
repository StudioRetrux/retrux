# judge-motion: G1 table from crawl_<path>.json (BASE / FIX / AA7 / GT, NEW masks). Gates: slow / medium >= 50 % per box and total;
# fast / diag / reverse / leave >= 40 % per box and total, except FS (L9): >= min(40, GT's own FS reduction - 5); FS MCE <= FIX's;
# L4: AA7's J32 / J48 reduction >= GT's reduction - 5 points (every box, every path; GT on all six).
import json, sys, os
W = sys.argv[1]
thr = {"slow": 50, "medium": 50, "fast": 40, "diag": 40, "reverse": 40, "leave": 40}
pct = lambda x, y: 100.0 * (y - x) / x if x else float("nan")
fails = []
for p in ["slow", "medium", "fast", "diag", "reverse", "leave"]:
    f = f"{W}/ana/crawl_{p}.json"
    if not os.path.exists(f): print(f"{p:8s} (missing)"); continue
    s = json.load(open(f))["summary"]
    B, F, A, G = s["BASE"], s["FIX"], s["AA7"], s.get("GT")
    cells = []
    for box in ["FS", "WR", "DR", "FF", "FR", "RS", "tot"]:
        sel = lambda x: x["tot"] if box == "tot" else x["box"][box]
        b, fx, a, g = sel(B), sel(F), sel(A), sel(G)
        ma, mf, mg = pct(b["mc32"], a["mc32"]), pct(b["mc32"], fx["mc32"]), pct(b["mc32"], g["mc32"])
        gate = thr[p]
        if box == "FS" and p not in ("slow", "medium"): gate = min(40, -mg - 5)
        ok = ma <= -gate
        c = f"{box}:{ma:+.1f}{'' if ok else '!'}(gate -{gate:.0f}; GT {mg:+.0f}; fix {mf:+.0f})"
        if not ok: fails.append(f"{p} {box} MC32 {ma:+.1f} % (gate -{gate:.0f}; GT {mg:+.0f}; fix {mf:+.0f})")
        if box == "FS":
            c += f" mce {a['mce']:.3f} vs fix {fx['mce']:.3f} GT {g['mce']:.3f}"
            if a["mce"] > fx["mce"]: fails.append(f"{p} FS MCE {a['mce']:.3f} > FIX {fx['mce']:.3f}")
        js = []
        for j in ("j32", "j48"):
            ja, jg = pct(b[j], a[j]), pct(b[j], g[j])
            if -ja < -jg - 5: fails.append(f"{p} {box} {j} AA7 {ja:+.0f} vs GT {jg:+.0f} (L4 floor {jg + 5:+.0f})")
            js.append(f"{j} {ja:+.0f}/GT {jg:+.0f}")
        cells.append(c + " [" + ", ".join(js) + "]")
    print(f"== {p}  texLake {s['AA7'].get('texLakeRatio')} texSolid {s['AA7'].get('texSolidRatio')}")
    for c in cells: print("   " + c)
print("\nGATE / L4 / MCE MISSES:" if fails else "\nno gate / L4 / MCE miss")
for x in fails: print("  " + x)
