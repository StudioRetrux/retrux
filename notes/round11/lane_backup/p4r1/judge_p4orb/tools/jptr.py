import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1/ptr'; L = SP + '/work_p4/p4orb/qc_final/ptr'
out = SP + '/work_p4/judge_p4orb/img'
n = sys.argv[1]; x, y, w, h, z = map(int, sys.argv[2:7])
a = load(f'{M}/{n}.png'); b = load(f'{L}/{n}.png')
save(f'{out}/ptrz_{n}.png', hstack([up(crop(a, x, y, w, h), z), up(crop(b, x, y, w, h), z)]))
