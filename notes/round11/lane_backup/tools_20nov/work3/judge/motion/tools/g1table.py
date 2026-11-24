import json, sys
J = sys.argv[1]
thr = {"slow": 50, "medium": 50, "fast": 40, "diag": 40, "reverse": 40, "leave": 40}
rows = []
for p in ["slow", "medium", "fast", "diag", "reverse", "leave"]:
    d = json.load(open(f"{J}/ana/crawl_{p}.json"))["summary"]
    b, a, g = d["base"], d["aa3"], d.get("gt")
    def pct(x, y): return 100.0 * (y - x) / x if x else float("nan")
    for box in ["FS", "WR", "DR", "FF", "FR", "RS", "tot"]:
        B = b["tot"] if box == "tot" else b["box"][box]
        A = a["tot"] if box == "tot" else a["box"][box]
        G = (g["tot"] if box == "tot" else g["box"][box]) if g else None
        mc = pct(B["mc32"], A["mc32"])
        ok = mc <= -thr[p]
        s = f"{p:8s} {box:4s} MC32 {B['mc32']:6.2f} -> {A['mc32']:6.2f} ({mc:+5.0f}%) {'ok ' if ok else 'LOW'}"
        if G:
            j32a, j32g = pct(B["j32"], A["j32"]), pct(B["j32"], G["j32"])
            j48a, j48g = pct(B["j48"], A["j48"]), pct(B["j48"], G["j48"])
            mcg = pct(B["mc32"], G["mc32"])
            s += f" | GT MC32 {mcg:+4.0f}% | J32 {j32a:+4.0f}% vs GT {j32g:+4.0f}% ({'ok' if abs(j32a-j32g)<=5 else 'off'}) | J48 {j48a:+4.0f}% vs GT {j48g:+4.0f}% ({'ok' if abs(j48a-j48g)<=5 else 'off'})"
            s += f" | eg(+-3) {B['eg']:.3f}->{A['eg']:.3f} ({pct(B['eg'],A['eg']):+.0f}%) MCE {B['mce']:.3f}->{A['mce']:.3f} (GT {G['mce']:.3f})"
        rows.append(s)
print("\n".join(rows))
