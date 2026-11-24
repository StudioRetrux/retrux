# judge p4orb3: paired deterministic captures lane (L) vs MAIN :5173 (M). Per pose/tau: orb metrics (box241 clip, interior r<.75R crystals
# masked: L10/50/90, sd, share<215/<235, core r<.5R >=250, rim band .86-.96R, hairline .97-1R), crystal p95/median/sat (B-R>=85 px),
# full-frame change map: share of px |dL|>2 / >6 outside 1.6 R of the orb and outside crystals; crops MAIN|lane|REF (+200-255 stretch).
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]; O = sys.argv[2]; os.makedirs(O, exist_ok=True)
pairs = [x.split(':') for x in (sys.argv[3] if len(sys.argv) > 3 else 'M:L').split(',')]
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
refs = {'q00': ('ref_F000', (707, 336), 62), 'q03': ('loop_F045', (716, 350), 48), 'p04': ('ref_F358', (677, 432), 75),
        'p05': ('ref_F402', (709, 408), 80), 'p06': ('ref_F420', (695, 414), 80), 'p07': ('ref_F453', (720, 387), 55), 'p08': ('ref_F460', (723, 382), 55)}
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
crm = lambda F: (F[..., 2] - F[..., 0] >= 60) & (sat(F) > 0.3)
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    a = np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
    return a, m
def ost(a, cx, cy, R0):
    x0, y0 = int(round(cx - 120)), int(round(cy - 120)); box = a[max(0, y0):y0+241, max(0, x0):x0+241]
    H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy); l = luma(a); cr = crm(a)
    m75 = (rr < 0.75 * R0) & ~cr; dl = l[m75]
    band = (rr >= 0.86 * R0) & (rr < 0.96 * R0) & ~cr; hair = (rr >= 0.97 * R0) & (rr < 1.0 * R0) & ~cr
    cz = (a[..., 2] - a[..., 0] >= 85) & (sat(a) > 0.3) & (rr < 4.5 * R0); lc = l[cz]
    return dict(c248=(box.min(-1) >= 248).mean() * 100, c250=(box.min(-1) >= 250).mean() * 100, core=(l[(rr < 0.5 * R0) & ~cr] >= 250).mean() * 100,
                L10=np.percentile(dl, 10), L50=np.percentile(dl, 50), L90=np.percentile(dl, 90), sd=dl.std(), f215=(dl < 215).mean() * 100, f235=(dl < 235).mean() * 100,
                bandL=np.median(l[band]), bandBR=np.median((a[..., 2] - a[..., 0])[band]), hairRGB=np.median(a[hair], 0),
                cn=cz.sum(), cp95=np.percentile(lc, 95) if cz.sum() > 50 else 0, cmed=np.median(lc) if cz.sum() > 50 else 0, csat=np.median(sat(a)[cz]) if cz.sum() > 50 else 0)
def fmt(t, s):
    return (f"{t:22s} box248/250 {s['c248']:5.1f}/{s['c250']:5.1f}% core>=250 {s['core']:5.1f}% | r<.75R L10/50/90 {s['L10']:.0f}/{s['L50']:.0f}/{s['L90']:.0f} sd {s['sd']:4.1f}"
            f" <215 {s['f215']:4.1f}% <235 {s['f235']:4.1f}% | band L {s['bandL']:.0f} B-R {s['bandBR']:+.0f} | hair {s['hairRGB'].round(0)} | crys n {s['cn']} p95 {s['cp95']:.1f} med {s['cmed']:.1f} sat {s['csat']:.3f}")
names = sorted({f[:-5] for f in os.listdir(D) if f.endswith('.json')})
lines = []
for A, B in pairs:
    keys = sorted({n.split('_', 2)[2] for n in names if n.startswith(A + '_base_')})
    for key in keys:
        na, nb = f'{A}_base_{key}', f'{B}_base_{key}'
        if nb not in names: continue
        pose = key.split('_')[0]
        a, m = rd(na); b, _ = rd(nb); o = m['orb']; cx, cy, R0 = o['x'], o['y'], o['r']
        rf, (rx, ry), rb = refs[pose]; ra = load(f'{R}/{rf}.png')
        sa, sb, sr = ost(a, cx, cy, R0), ost(b, cx, cy, R0), ost(ra, rx, ry, rb)
        H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy)
        d = luma(b) - luma(a); cr = crm(a) | crm(b)
        from numpy.lib.stride_tricks import sliding_window_view as sw
        dil = sw(np.pad(cr, 5), (11, 11)).max(axis=(-1, -2))
        far = (rr > 1.6 * R0) & ~dil
        near = (rr <= 1.6 * R0) & ~dil
        ann = ' '.join(f"{d[(rr >= r0 * R0) & (rr < r1 * R0) & ~dil].mean():+.2f}" for r0, r1 in ((0, .75), (.75, 1.02), (1.02, 1.25), (1.25, 1.6), (1.6, 2.5), (2.5, 4)))
        lines.append(f"== {A}->{B} {key}  orb ({cx:.0f},{cy:.0f}) R {R0:.1f} clock {m.get('clock', 0):.2f}")
        lines.append(fmt('REF ' + rf, sr)); lines.append(fmt(A + ' MAIN', sa)); lines.append(fmt(B + ' lane', sb))
        lines.append(f"   change lane-MAIN: far(>1.6R, no crystals) px|dL|>2 {(np.abs(d[far]) > 2).mean() * 100:.3f}% >6 {(np.abs(d[far]) > 6).mean() * 100:.3f}% max {np.abs(d[far]).max():.0f}"
                     f" | near px>6 {(np.abs(d[near]) > 6).mean() * 100:.1f}% | dL by annulus 0-.75/.75-1.02/1.02-1.25/1.25-1.6/1.6-2.5/2.5-4 R: {ann}")
        hs = int(max(70, min(170, 1.35 * R0)))
        c1 = crop(a, int(cx) - hs, int(cy) - hs, 2 * hs, 2 * hs); c2 = crop(b, int(cx) - hs, int(cy) - hs, 2 * hs, 2 * hs)
        k = rb / max(1.0, R0); rh = int(round(hs * k)); rc = crop(ra, rx - rh, ry - rh, 2 * rh, 2 * rh)
        yi = (np.arange(2 * hs) * (2 * rh) / (2 * hs)).astype(int).clip(0, 2 * rh - 1); rc = rc[yi][:, yi]
        cs = [c1, c2, rc]; st = [(x - 200) / 55 * 255 for x in cs]
        dm = np.stack([np.clip(128 + 6 * d, 0, 255)] * 3, -1)
        big = vstack([hstack(cs), hstack(st)])
        save(f'{O}/{A}{B}_{key}.png', big)
        save(f'{O}/{A}{B}_{key}_diff.png', dm[::2, ::2])
txt = '\n'.join(lines); print(txt); open(f'{O}/det_stats_{"_".join(a + b for a, b in pairs)}.txt', 'w').write(txt + '\n')
