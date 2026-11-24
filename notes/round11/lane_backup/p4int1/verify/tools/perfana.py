# int1 perf summary from perfab's .txt logs (per run: pair, side, stats JSON, 1-min load after the run).
# Pair ratio = B (int1 :5173) / A (MAIN :5199) of the median and of the mean RAF interval; pairs with either run at load >= 10 flagged.
import sys, json, re, statistics as st
for path in sys.argv[1:]:
    runs = {}
    for line in open(path):
        m = re.match(r"^(\d+) ([AB]) (\{.*\}) load ([\d.]+)", line.strip())
        if m: runs[(int(m.group(1)), m.group(2))] = (json.loads(m.group(3)), float(m.group(4)))
    pairs = sorted({k[0] for k in runs})
    rm, rmean, rm_ok, rmean_ok, rows = [], [], [], [], []
    for p in pairs:
        if (p, "A") not in runs or (p, "B") not in runs: continue
        (a, la), (b, lb) = runs[(p, "A")], runs[(p, "B")]
        r1, r2 = b["med"] / a["med"], b["mean"] / a["mean"]
        ok = la < 10 and lb < 10
        rm.append(r1); rmean.append(r2)
        if ok: rm_ok.append(r1); rmean_ok.append(r2)
        held = f" held A {a.get('held')} B {b.get('held')}" if a.get("held") else ""
        rows.append(f"  pair {p}: A med {a['med']:.1f} mean {a['mean']:.2f} p95 {a['p95']:.1f} n {a['n']} (load {la}) | B med {b['med']:.1f} mean {b['mean']:.2f} p95 {b['p95']:.1f} n {b['n']} (load {lb}) | ratio med {r1:.3f} mean {r2:.3f}{'' if ok else '  [load >= 10]'}{held}")
    A = [runs[k][0] for k in runs if k[1] == "A"]; B = [runs[k][0] for k in runs if k[1] == "B"]
    print(f"== {path.split('/')[-1]}: {len(rm)} pairs")
    print("\n".join(rows))
    print(f"  median of medians A {st.median([r['med'] for r in A]):.2f} ms  B {st.median([r['med'] for r in B]):.2f} ms  (ratio {st.median([r['med'] for r in B]) / st.median([r['med'] for r in A]):.3f}); median of means A {st.median([r['mean'] for r in A]):.2f} B {st.median([r['mean'] for r in B]):.2f} (ratio {st.median([r['mean'] for r in B]) / st.median([r['mean'] for r in A]):.3f})")
    print(f"  paired ratio medians: med {st.median(rm):.3f}, mean {st.median(rmean):.3f}; load < 10 pairs ({len(rm_ok)}): med {st.median(rm_ok) if rm_ok else float('nan'):.3f}, mean {st.median(rmean_ok) if rmean_ok else float('nan'):.3f}")
