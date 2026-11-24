import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]; O = sys.argv[2]
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
refs = {'q00': 'ref_F000', 'q03': 'loop_F045', 'p04': 'ref_F358', 'p05': 'ref_F402', 'p06': 'ref_F420', 'p07': 'ref_F453', 'p08': 'ref_F460'}
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
rows = []
for k in sys.argv[3:]:
    a = rd(f'off_{k}'); b = rd(f'lane_{k}'); r = load(f"{R}/{refs[k.split('_')[0]]}.png")
    h = min(a.shape[0], r.shape[0]); w = min(a.shape[1], r.shape[1])
    dsc = lambda x: x[:h:2, :w:2]
    rows.append(hstack([dsc(a), dsc(b), dsc(r)]))
save(f'{O}/full_{"_".join(sys.argv[3:])}.png', vstack(rows))
