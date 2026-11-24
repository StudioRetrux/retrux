import json, sys, os
R = sys.argv[1]
thr = {"slow": 50, "medium": 50, "fast": 40, "diag": 40, "reverse": 40, "leave": 40}
def pct(x, y): return 100.0 * (y - x) / x if x else float("nan")
out = []
for p in ["slow", "medium", "fast", "diag", "reverse", "leave"]:
    f = f"{R}/ana/crawl_{p}.json"
    if not os.path.exists(f): continue
    d = json.load(open(f))["summary"]
    b, jd, fx, g = d["base"], d["judged"], d["fix"], d.get("gt")
    for box in ["FS", "WR", "DR", "FF", "FR", "RS", "tot"]:
        sel = lambda s: s["tot"] if box == "tot" else s["box"][box]
        B, JD, F = sel(b), sel(jd), sel(fx)
        G = sel(g) if g else None
        mj, mf = pct(B["mc32"], JD["mc32"]), pct(B["mc32"], F["mc32"])
        ok = mf <= -thr[p]
        s = f"{p:8s} {box:4s} MC32 base {B['mc32']:6.2f} judged {JD['mc32']:6.2f} ({mj:+4.0f}%) fix {F['mc32']:6.2f} ({mf:+4.0f}%) {'ok ' if ok else 'LOW'}"
        if G:
            s += f" | GT {pct(B['mc32'], G['mc32']):+4.0f}%"
            j32f, j32g = pct(B["j32"], F["j32"]), pct(B["j32"], G["j32"])
            j48f, j48g = pct(B["j48"], F["j48"]), pct(B["j48"], G["j48"])
            s += f" | J32 fix {j32f:+4.0f} GT {j32g:+4.0f} ({'ok' if abs(j32f-j32g)<=5 else 'off'}) J48 fix {j48f:+4.0f} GT {j48g:+4.0f} ({'ok' if abs(j48f-j48g)<=5 else 'off'})"
            s += f" | eg {B['eg']:.3f}/{JD['eg']:.3f}/{F['eg']:.3f} MCE {B['mce']:.3f}/{JD['mce']:.3f}/{F['mce']:.3f} GT {G['mce']:.3f}"
        out.append(s)
    tl = [f"texLake {d[n].get('texLakeRatio')} texSolid {d[n].get('texSolidRatio')}" for n in ("judged", "fix")]
    out.append(f"{p:8s} texture judged: {tl[0]} | fix: {tl[1]}")
print("\n".join(out))
