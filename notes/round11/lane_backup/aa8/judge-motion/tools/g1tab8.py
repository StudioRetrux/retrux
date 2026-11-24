# judge8-motion: G1 table from crawl_<path>.json (BASE / FIX / AA7 / AA8 / GT, NEW masks).
# Gates (brief): MC32 >= 50 % lower than BASE slow / medium, >= 40 % fast / diag / reverse / leave, per box AND total;
# L9: FS on fast / diag / reverse / leave >= min(40, GT's own FS reduction - 5); FS MCE <= FIX's; L4: J32 / J48 reduction >= GT's - 5.
# Extra (lens): AA8 vs AA7 per cell (reduction points; + = AA8 worse), and the margin of every cell (points inside its bar).
import json, sys, os
W = sys.argv[1]
thr = {"slow": 50, "medium": 50, "fast": 40, "diag": 40, "reverse": 40, "leave": 40}
pct = lambda x, y: 100.0 * (y - x) / x if x else float("nan")
fails, worse, margins = [], [], []
for p in ["slow", "medium", "fast", "diag", "reverse", "leave"]:
    f = f"{W}/ana/crawl_{p}.json"
    if not os.path.exists(f): print(f"{p:8s} (missing)"); continue
    s = json.load(open(f))["summary"]
    B, F, A7, A8, G = s["BASE"], s["FIX"], s["AA7"], s["AA8"], s["GT"]
    print(f"== {p}  texLake AA8 {A8.get('texLakeRatio')} (AA7 {A7.get('texLakeRatio')})  texSolid AA8 {A8.get('texSolidRatio')} (AA7 {A7.get('texSolidRatio')})")
    for box in ["FS", "WR", "DR", "FF", "FR", "RS", "tot"]:
        sel = lambda x: x["tot"] if box == "tot" else x["box"][box]
        b, fx, a7, a8, g = sel(B), sel(F), sel(A7), sel(A8), sel(G)
        m7, m8, mg, mf = pct(b["mc32"], a7["mc32"]), pct(b["mc32"], a8["mc32"]), pct(b["mc32"], g["mc32"]), pct(b["mc32"], fx["mc32"])
        gate = thr[p]
        l9 = box == "FS" and p not in ("slow", "medium")
        if l9: gate = min(40, -mg - 5)
        mar = -m8 - gate
        l11 = p in ("slow", "medium", "reverse") or (box == "FS" and p in ("fast", "diag", "leave"))
        margins.append((mar, f"{p} {box} MC32 AA8 {m8:+.1f} bar -{gate:.1f}{' (L9)' if l9 else ''}", l11))
        if m8 > -gate: fails.append(f"{p} {box} MC32 AA8 {m8:+.1f} % (bar -{gate:.1f}; GT {mg:+.0f}; fix {mf:+.0f})")
        if m8 - m7 > 1.0: worse.append(f"{p} {box} MC32 AA8 {m8:+.1f} vs AA7 {m7:+.1f} ({m8 - m7:+.1f} pts; abs {a8['mc32']} vs {a7['mc32']} per 1000)")
        line = f"   {box:3s} MC32 AA8 {m8:+6.1f} AA7 {m7:+6.1f} d {m8 - m7:+5.1f} | GT {mg:+4.0f} fix {mf:+4.0f} | bar -{gate:.1f} margin {mar:+5.1f}"
        if box == "FS":
            line += f" | MCE AA8 {a8['mce']:.3f} AA7 {a7['mce']:.3f} FIX {fx['mce']:.3f} GT {g['mce']:.3f}"
            if a8["mce"] > fx["mce"]: fails.append(f"{p} FS MCE AA8 {a8['mce']:.3f} > FIX {fx['mce']:.3f}")
        js = []
        for j in ("j32", "j48"):
            j7, j8, jg = pct(b[j], a7[j]), pct(b[j], a8[j]), pct(b[j], g[j])
            bar = jg + 5
            jm = bar - j8
            margins.append((jm, f"{p} {box} {j} AA8 {j8:+.1f} bar {bar:+.1f} (abs {a8[j]} vs BASE {b[j]}, GT {g[j]})", l11))
            if j8 > bar: fails.append(f"{p} {box} {j} AA8 {j8:+.1f} vs GT {jg:+.1f} (L4 floor {bar:+.1f})")
            if j8 - j7 > 2.0: worse.append(f"{p} {box} {j} AA8 {j8:+.1f} vs AA7 {j7:+.1f} ({j8 - j7:+.1f} pts; abs {a8[j]} vs {a7[j]} per 1000)")
            js.append(f"{j} AA8 {j8:+.0f} AA7 {j7:+.0f} GT {jg:+.0f} m {jm:+.1f}")
        print(line + " [" + "; ".join(js) + "]")
print("\nGATE / L4 / MCE MISSES (AA8):" if fails else "\nno gate / L4 / MCE miss (AA8)")
for x in fails: print("  " + x)
print("\nAA8 WORSE THAN AA7 (MC32 > 1 pt, J > 2 pts):" if worse else "\nno cell where AA8 is worse than AA7 beyond 1 pt (MC32) / 2 pts (J)")
for x in worse: print("  " + x)
print("\nTIGHTEST MARGINS (points inside the bar; L11 = slow / medium / reverse all boxes + FS L9 fast / diag / leave):")
for m, t, l11 in sorted(margins)[:12]: print(f"  {m:+6.2f}  {'L11 ' if l11 else 'info'}  {t}")
print("  L11 cells below +1.0:", [t for m, t, l11 in margins if l11 and m < 1.0] or "none")
