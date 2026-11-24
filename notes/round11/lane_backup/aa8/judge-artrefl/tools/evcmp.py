# compare popscan events X vs R (json from popscan.mjs): for each X event >= minpx, overlapping R events (k range and bbox +-3)
import json, sys
f, X, R = sys.argv[1], sys.argv[2], sys.argv[3]; minpx = int(sys.argv[4]) if len(sys.argv) > 4 else 6
d = json.load(open(f))
ex = [e for e in d[X]['list'] if e['n'] >= minpx]; er = d[R]['list']
def ov(a, b):
    return a['k0'] <= b['k1'] + 1 and b['k0'] <= a['k1'] + 1 and a['x0'] - 3 <= b['x1'] and b['x0'] - 3 <= a['x1'] and a['y0'] - 3 <= b['y1'] and b['y0'] - 3 <= a['y1']
rows = []
for e in ex:
    m = [r for r in er if ov(e, r)]; nr = sum(r['n'] for r in m); emr = max([r['emax'] for r in m] or [0])
    rows.append((e['n'] - nr, e, nr, emr))
rows.sort(key=lambda t: -t[0])
print(f"{X} events >= {minpx}: {len(ex)}, px {sum(e['n'] for e in ex)}; with no {R} overlap: {sum(1 for t in rows if t[2]==0)}")
for dn, e, nr, emr in rows[:12]:
    print(f"  k{e['k0']}-{e['k1']} x{e['x0']}-{e['x1']} y{e['y0']}-{e['y1']} n{e['n']} emax{round(e['emax'])}  |  {R} n{nr} emax{round(emr)}  (+{dn})")
