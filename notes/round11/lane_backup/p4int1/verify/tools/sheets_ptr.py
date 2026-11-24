# S1 ptr overview (int1 r11_2), S2 ptr diff maps int1 vs MAIN r11_1, S3 glitch-box zooms (common percentile stretch per pair)
import sys; sys.path.insert(0, sys.argv[1] + '/tools'); import vlib as v, numpy as np
V, SP = sys.argv[1], sys.argv[2]
M, I = SP + '/p3/r11_1/ptr/', SP + '/p3/r11_2/ptr/'
spots = ['rest', 'left', 'right', 'top', 'bottom', 'top_left', 'top_right', 'bottom_left', 'bottom_right', 'orb']
def dmax(a, k):
    h, w = a.shape[0]//k*k, a.shape[1]//k*k
    return a[:h, :w].reshape(h//k, k, w//k, k, 3).max((1, 3))
cells, dcells, stats = [], [], []
for s in spots:
    a, b = v.load(M + f'ptr_{s}.png'), v.load(I + f'ptr_{s}.png')
    cells.append(v.down(b, 3)); d = np.abs(a - b).max(2)
    dcells.append(dmax(v.diffmap(a, b, 6), 3))
    ys, xs = np.nonzero(d > 8)
    # where do the >8 differences sit: coarse 120 px cells, top 6
    c = {}
    for x, y in zip(xs, ys): k = (x // 120 * 120, y // 120 * 120); c[k] = c.get(k, 0) + 1
    stats.append(f"{s:13s} max {d.max():4.0f} n>8 {len(xs):6d} bbox {(xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None} top {sorted(c.items(), key=lambda kv: -kv[1])[:6]}")
pad = np.zeros_like(cells[0])
rows = [v.hst(cells[i:i+3] + [pad] * (3 - len(cells[i:i+3]))) for i in range(0, 10, 3)]
v.save(V + '/img/S1_ptr_overview_int1.png', v.vst(rows))
rows = [v.hst(dcells[i:i+3] + [np.zeros_like(dcells[0])] * (3 - len(dcells[i:i+3]))) for i in range(0, 10, 3)]
v.save(V + '/img/S2_ptr_diff_int1_vs_main_x6.png', v.vst(rows))
open(V + '/ana/ptr_diff_stats.txt', 'w').write("int1 r11_2 vs MAIN r11_1, |diff| max over RGB, >8 counted; spots in grid order (row-major, 3 per row)\n" + "\n".join(stats) + "\n")
print("\n".join(stats))
# S3: glitch-box zooms, each pair MAIN | int1 with one common stretch
def pair(spot, box, k):
    a, b = v.load(M + f'ptr_{spot}.png'), v.load(I + f'ptr_{spot}.png')
    ca, cb = v.crop(a, *box), v.crop(b, *box)
    sa, sb = v.stretch([ca, cb])
    return v.hst([v.up(sa, k), v.up(sb, k)], gap=3, col=255), (np.abs(ca - cb).max(2).max(), v.luma(ca).mean(), v.luma(cb).mean())
out, notes = [], []
for spot in ['right', 'top_right', 'bottom_right']:
    im, st = pair(spot, (1180, 290, 1440, 430), 2); out.append(im); notes.append(f"ghost box x1180-1440 y290-430 {spot}: maxdiff {st[0]:.0f} luma MAIN {st[1]:.1f} int1 {st[2]:.1f}")
v.save(V + '/img/S3a_ghost_right_MAIN_vs_INT1_2x_str.png', v.vst(out))
out = []
for spot in ['left', 'top_left', 'bottom_left']:
    im, st = pair(spot, (1000, 280, 1440, 470), 1); out.append(im); notes.append(f"left-orbit box x1000-1440 y280-470 {spot}: maxdiff {st[0]:.0f} luma MAIN {st[1]:.1f} int1 {st[2]:.1f}")
v.save(V + '/img/S3b_leftorbit_far_MAIN_vs_INT1_1x_str.png', v.vst(out))
out = []
for spot, box in [('left', (1120, 370, 1250, 460)), ('top_left', (1120, 390, 1250, 480)), ('bottom_left', (1120, 340, 1250, 430))]:
    im, st = pair(spot, box, 3); out.append(im); notes.append(f"hairline box {box} {spot}: maxdiff {st[0]:.0f}")
v.save(V + '/img/S3c_hairlines_MAIN_vs_INT1_3x_str.png', v.vst(out))
out = []
for spot, box in [('right', (480, 440, 640, 520)), ('rest', (260, 450, 440, 500)), ('left', (160, 450, 340, 500))]:
    im, st = pair(spot, box, 3); out.append(im); notes.append(f"lake/shelf box {box} {spot}: maxdiff {st[0]:.0f} luma MAIN {st[1]:.1f} int1 {st[2]:.1f}")
v.save(V + '/img/S3d_lakecorr_shelf_MAIN_vs_INT1_3x_str.png', v.vst(out))
# bottom strip of every spot (the client's 'nothing weird at the bottom'): y 656-766, MAIN above int1, 1/2 scale
out = []
for s in spots:
    a, b = v.load(M + f'ptr_{s}.png'), v.load(I + f'ptr_{s}.png')
    out.append(v.hst([v.down(v.crop(a, 0, 656, 1440, 766), 2), v.down(v.crop(b, 0, 656, 1440, 766), 2)], gap=3))
v.save(V + '/img/S3e_bottomstrip_10spots_MAIN_vs_INT1.png', v.vst(out, gap=3))
open(V + '/ana/ptr_glitchboxes.txt', 'w').write("\n".join(notes) + "\n"); print("\n".join(notes))
