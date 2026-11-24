import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'; M1=SP+'/p3/r11_1'; M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'; O=SP+'/work_p4/judge_p4atmos/an'
poses={'q00_rest':'ref_F000','q01_loop15':'loop_F015','q02_loop30':'loop_F030','q03_eye':'loop_F045','p04_expand_pop':'ref_F358','p05_expand':'ref_F402','p06_sustain':'ref_F420','p07_release_snap':'ref_F453','p08_release_home':'ref_F460'}
for p, r in poses.items():
    ims=[load(f'{R}/{r}.png'), load(f'{M1}/{p}.png'), load(f'{M2}/{p}.png'), load(f'{LN}/{p}.png')]
    g=vst([hst([half(ims[0]), half(ims[1])]), hst([half(ims[2]), half(ims[3])])])
    save(f'{O}/full4_{p}.png', g)
# rest crops: right (iceberg / shore / far bergs) and left (massif, ridge, left mist)
for p in ['q00_rest','q03_eye']:
    r=poses[p]; ims=[load(f'{R}/{r}.png'), load(f'{M1}/{p}.png'), load(f'{M2}/{p}.png'), load(f'{LN}/{p}.png')]
    save(f'{O}/right4_{p}.png', vst([crop(i, 840, 290, 600, 190) for i in ims]))
    save(f'{O}/left4_{p}.png', vst([crop(i, 0, 170, 640, 300) for i in ims]))
print('ok')
