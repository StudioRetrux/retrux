import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
D = SP + '/work_p4/judge_p4orb/flick'
M = SP + '/p3/r11_1'; L = SP + '/work_p4/p4orb/qc_final'; R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
def fr(tag, i):
    m = json.load(open(f'{D}/{tag}_hold_meta.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{tag}_hold_{i:02d}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
def stretch(a, lo=200, hi=255):
    return (a - lo) / (hi - lo) * 255
# qc p06/p05 orb crops (native), plain + stretched; ref F402 for p05
rows = []
for pose, (cx, cy), ref, (rx, ry) in (('p05_expand', (716, 398), 'ref_F402', (709, 408)), ('p06_sustain', (722, 369), 'ref_F420', (695, 414))):
    a = load(f'{M}/{pose}.png'); b = load(f'{L}/{pose}.png'); r = load(f'{R}/{ref}.png')
    c = lambda im, x, y: crop(im, x - 110, y - 110, 220, 220)
    rows.append(hstack([c(a, cx, cy), c(b, cx, cy), c(r, rx, ry), stretch(c(a, cx, cy)), stretch(c(b, cx, cy)), stretch(c(r, rx, ry))]))
save(f'{SP}/work_p4/judge_p4orb/img/orb_stretch_p05_p06.png', vstack(rows))
