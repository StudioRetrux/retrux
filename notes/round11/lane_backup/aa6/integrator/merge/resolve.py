import sys, re
src = open(sys.argv[1]).read().split('\n')
out = []; i = 0; n = 0
while i < len(src):
    l = src[i]
    if l.startswith('<<<<<<< '):
        ours = []; theirs = []; i += 1
        while not src[i].startswith('======='):
            ours.append(src[i]); i += 1
        i += 1
        while not src[i].startswith('>>>>>>> '):
            theirs.append(src[i]); i += 1
        i += 1
        out += ours + theirs; n += 1
        continue
    out.append(l); i += 1
open(sys.argv[2], 'w').write('\n'.join(out))
print('resolved', n, 'conflicts (ours then theirs)')
