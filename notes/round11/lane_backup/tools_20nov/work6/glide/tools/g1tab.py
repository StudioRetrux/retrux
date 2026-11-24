# prejudge-glide: G1 table from crawl{NEW,OLD}_<path>.json (BASE / FIX / AA6 / GT); gate slow/medium >= 50 %, others >= 40 %
# (per box AND total); L4: AA6's J32 / J48 reduction >= GT's reduction - 5 points (GT paths only).
import json, sys, os
W = sys.argv[1]
thr = {"slow": 50, "medium": 50, "fast": 40, "diag": 40, "reverse": 40, "leave": 40}
pct = lambda x, y: 100.0 * (y - x) / x if x else float("nan")
fails = []
for mk in ["NEW", "OLD"]:
    print(f"== {mk} masks ({'aa5a bloom-free capm' if mk == 'NEW' else 'motion judge cap.mjs'}), MC32 % vs BASE (FIX = aa3_fixed1 for calibration)")
    for p in ["slow", "medium", "fast", "diag", "reverse", "leave"]:
        f = f"{W}/ana/crawl{mk}_{p}.json"
        if not os.path.exists(f): print(f"{p:8s} (missing)"); continue
        d = json.load(open(f)); s = d["summary"]
        B, F, A, G = s["BASE"], s["FIX"], s["AA6"], s.get("GT")
        cells = []
        for box in ["FS", "WR", "DR", "FF", "FR", "RS", "tot"]:
            sel = lambda x: x["tot"] if box == "tot" else x["box"][box]
            b, fx, a = sel(B), sel(F), sel(A)
            ma, mf = pct(b["mc32"], a["mc32"]), pct(b["mc32"], fx["mc32"])
            ok = ma <= -thr[p]
            c = f"{box}:{ma:+.0f}{'' if ok else '!'}(fix {mf:+.0f})"
            if not ok: fails.append(f"{mk} {p} {box} MC32 {ma:+.0f} % (gate -{thr[p]}; fix {mf:+.0f})")
            if G:
                g = sel(G)
                for j in ("j32", "j48"):
                    ja, jg = pct(b[j], a[j]), pct(b[j], g[j])
                    if -ja < -jg - 5: fails.append(f"{mk} {p} {box} {j} AA6 {ja:+.0f} vs GT {jg:+.0f} (L4 floor {jg + 5:+.0f})")
                c += f"[J32 {pct(b['j32'], a['j32']):+.0f}/GT {pct(b['j32'], g['j32']):+.0f} J48 {pct(b['j48'], a['j48']):+.0f}/GT {pct(b['j48'], g['j48']):+.0f}]"
            cells.append(c)
        tex = f"texLake {s['AA6'].get('texLakeRatio')} texSolid {s['AA6'].get('texSolidRatio')}"
        print(f"{p:8s} " + "  ".join(cells) + f"  | {tex}")
print("\nGATE / L4 MISSES:" if fails else "\nno gate / L4 miss")
for x in fails: print("  " + x)
