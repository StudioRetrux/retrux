# p4orb3 F4: crystal stats on dv.mjs captures (the judge's shardpair metric: px with B-R >= 85, frame cols 2:-2): L median / p90 /
# p95 / p98, median saturation, n; vs REF. Plus a zoom sheet of the most crystal-dense box per pose (variants + REF).
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__) + '/rj')
from jlib import *
D = sys.argv[1]; O = sys.argv[2]; TAG = sys.argv[3]
os.makedirs(O, exist_ok=True)
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
refs = {'q00': 'ref_F000', 'q03': 'loop_F045', 'p04': 'ref_F358', 'p05': 'ref_F402', 'p06': 'ref_F420', 'p07': 'ref_F453', 'p08': 'ref_F460'}
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
def st(a):
    a = a[:, 2:-2]; m = (a[..., 2] - a[..., 0]) >= 85; p = a[m]
    l = 0.2126*p[:,0]+0.7152*p[:,1]+0.0722*p[:,2]; s = (p.max(1) - p.min(1)) / np.maximum(p.max(1), 1)
    return f"n {m.sum():6d} L med {np.median(l):5.1f} p90 {np.percentile(l,90):5.1f} p95 {np.percentile(l,95):5.1f} p98 {np.percentile(l,98):5.1f} sat {np.median(s):.3f}"
names = sorted({f[:-5] for f in os.listdir(D) if f.endswith('.json') and f.startswith(TAG + '_')})
groups = {}
for n in names:
    parts = n.split('_'); groups.setdefault('_'.join(parts[-2:]), []).append(n)
for key in sorted(groups):
    pose = key.split('_')[0]; r = load(f"{R}/{refs[pose]}.png")
    print(f"== {key}\n  {'REF ' + refs[pose]:22s} {st(r)}")
    for n in groups[key]:
        print(f"  {n[len(TAG)+1:]:22s} {st(rd(n))}")
