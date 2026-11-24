# p4orb3: analysis of dv.mjs captures. Per capture: the judge's orb metrics (box241 min-ch >= 248 / >= 250 around the projected
# orb; interior r < 0.75 R with crystals masked: L10/50/90, sd, share < 215; rim band 0.86-0.96 R and hairline 0.97-1.0 R: L and
# B-R; HDR max-channel percentiles inside 0.75 R when present) and a crop sheet per pose: variants side by side + REF, normal and
# 200-255 stretched.   BPY -I dva.py DIR OUTDIR [tag]
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__) + '/rj')
from jlib import *
D = sys.argv[1]; O = sys.argv[2]; TAG = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(O, exist_ok=True)
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
# judge's reference centres; bright radii from rimprof (F402 80, F045 48, F453 55), others estimated
refs = {'q00': ('ref_F000', (707, 336), 62), 'q03': ('loop_F045', (716, 350), 48), 'p04': ('ref_F358', (677, 432), 75),
        'p05': ('ref_F402', (709, 408), 80), 'p06': ('ref_F420', (695, 414), 80), 'p07': ('ref_F453', (720, 387), 55),
        'p08': ('ref_F460', (723, 382), 55)}
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
crm = lambda F: (F[..., 2] - F[..., 0] >= 60) & (sat(F) > 0.3)
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    a = np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
    hd = None
    if m.get('hd') and os.path.exists(f'{D}/{nm}.hdr16'):
        q = m['hd']; hd = np.frombuffer(open(f'{D}/{nm}.hdr16', 'rb').read(), np.float16).reshape(q['h'], q['w'], 4)[::-1, :, :3].astype(np.float32)
    return a, m, hd
def ostats(a, cx, cy, R0, hd=None, m=None):
    x0, y0 = int(round(cx - 120)), int(round(cy - 120)); box = a[y0:y0+241, x0:x0+241]
    c248 = (box.min(-1) >= 248).mean() * 100; c250 = (box.min(-1) >= 250).mean() * 100
    H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy)
    l = luma(a); cr = crm(a)
    m75 = (rr < 0.75 * R0) & ~cr; dl = l[m75]
    band = (rr >= 0.86 * R0) & (rr < 0.96 * R0) & ~cr; hair = (rr >= 0.97 * R0) & (rr < 1.0 * R0) & ~cr
    bb = a[band]; hh = a[hair]
    s = dict(c248=c248, c250=c250, L10=np.percentile(dl, 10), L50=np.percentile(dl, 50), L90=np.percentile(dl, 90), sd=dl.std(),
             f215=(dl < 215).mean() * 100, f235=(dl < 235).mean() * 100, bandL=np.median(luma(bb)), bandBR=np.median(bb[:, 2] - bb[:, 0]),
             hairL=np.median(luma(hh)), hairBR=np.median(hh[:, 2] - hh[:, 0]), hairRGB=np.median(hh, 0), core250=(l[(rr < 0.5 * R0) & ~cr] >= 250).mean() * 100)
    if hd is not None:
        q = m['hd']; sx = q['sx']; Hh = hd.shape[0]
        y2, x2 = np.mgrid[0:Hh, 0:hd.shape[1]]
        # hd rows were flipped to top-down: row 0 = top of the box; box top in screen px = H - (y0 + h)
        px = (q['x0'] + x2 + 0.5) / sx; py = (H - (q['y0'] + Hh) + y2 + 0.5) / sx
        r2 = np.hypot(px - cx, py - cy); mx = hd.max(-1)[r2 < 0.75 * R0]
        s['hdr'] = np.percentile(mx, [10, 25, 50, 75, 90])
    return s
def fmt(t, s):
    o = (f"{t:28s} box>=248 {s['c248']:5.1f}% >=250 {s['c250']:5.1f}% core<0.5R>=250 {s['core250']:5.1f}% | r<.75R L10/50/90 {s['L10']:.0f}/{s['L50']:.0f}/{s['L90']:.0f}"
         f" sd {s['sd']:4.1f} <215 {s['f215']:4.1f}% <235 {s['f235']:4.1f}% | band.86-.96 L {s['bandL']:.0f} B-R {s['bandBR']:+.0f} | hair .97-1 L {s['hairL']:.0f} B-R {s['hairBR']:+.0f} RGB {s['hairRGB'].round(0)}")
    if 'hdr' in s: o += ' | HDR maxch p10/25/50/75/90 ' + '/'.join(f'{v:.2f}' for v in s['hdr'])
    return o
def refstats(pose):
    ref, (cx, cy), rb = refs[pose]; a = load(f'{R}/{ref}.png')
    return a, ostats(a, cx, cy, rb), (cx, cy, rb)
names = sorted({f[:-5] for f in os.listdir(D) if f.endswith('.json') and (TAG is None or f.startswith(TAG + '_'))})
# group by pose_tau
groups = {}
for n in names:
    parts = n.split('_'); key = '_'.join(parts[-2:]); groups.setdefault(key, []).append(n)
lines = []
for key in sorted(groups):
    pose = key.split('_')[0]
    ra, rs, (rx, ry, rb) = refstats(pose)
    lines.append(f'== {key}'); lines.append(fmt(f'REF {refs[pose][0]} (r {rb})', rs))
    crops, st = [], []
    bname = [n for n in groups[key] if '_base_' in n]
    base = rd(bname[0])[0] if bname else None
    for n in groups[key]:
        a, m, hd = rd(n); o = m['orb']; cx, cy, R0 = o['x'], o['y'], o['r']
        s = ostats(a, cx, cy, R0, hd, m)
        extra = ''
        if base is not None and n not in bname:
            H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy)
            cr = crm(a) | crm(base)
            from numpy.lib.stride_tricks import sliding_window_view as sw
            dil = sw(np.pad(cr, 4), (9, 9)).max(axis=(-1, -2))
            d = luma(a) - luma(base); ann = []
            for r0, r1 in ((1.02, 1.25), (1.25, 1.5), (1.5, 2.0), (2.0, 2.5), (2.5, 3.5)):
                mm = ~dil & (rr >= r0 * R0) & (rr < r1 * R0)
                if mm.sum() > 20: ann.append(f"{d[mm].mean():+.2f}")
            mi = ~dil & (rr < 0.75 * R0)
            extra = f" | vs base: disc dL {d[mi].mean():+.1f} | ice annuli 1.02-3.5R dL " + ' '.join(ann)
        lines.append(fmt(n[len(TAG) + 1:] if TAG else n, s) + f" | orb ({cx:.0f},{cy:.0f}) R {R0:.1f} clock {m.get('clock', 0):.2f}" + extra)
        hs = int(max(60, min(170, 1.35 * R0)))
        c = crop(a, int(cx) - hs, int(cy) - hs, 2 * hs, 2 * hs); crops.append(c)
    # the REF crop scaled to the same bright-radius ratio roughly (nearest) for side-by-side
    hs = crops[0].shape[0] // 2
    k = rb / max(1.0, json.load(open(f'{D}/{groups[key][0]}.json'))['orb']['r'])
    rh = int(round(hs * k)); rc = crop(ra, rx - rh, ry - rh, 2 * rh, 2 * rh)
    yi = (np.arange(2 * hs) * (2 * rh) / (2 * hs)).astype(int).clip(0, 2 * rh - 1); rc = rc[yi][:, yi]
    crops.append(rc)
    st = [(x - 200) / 55 * 255 for x in crops]
    big = vstack([hstack(crops), hstack(st)])
    if big.shape[1] < 1800: big = up(big, 2) if big.shape[1] * 2 <= 2400 else big
    save(f'{O}/{(TAG + "_") if TAG else ""}{key}.png', big)
txt = '\n'.join(lines); print(txt)
open(f'{O}/{(TAG + "_") if TAG else ""}stats.txt', 'w').write(txt + '\n')
