import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'; M1=SP+'/p3/r11_1'; M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'; O=SP+'/work_p4/judge_p4atmos/an'
ims=[load(f'{R}/ref_F000.png'), load(f'{M2}/q00_rest.png'), load(f'{LN}/q00_rest.png')]
save(f'{O}/bergbase2x_q00.png', vst([up(crop(i, 900, 370, 380, 100),2) for i in ims]))
# region numbers: berg base, mid face, right end, waterline rows, far bergs
B={'berg_base x950-1150 y420-455':(950,420,1150,455),'berg_mid x1020-1140 y380-410':(1020,380,1140,410),'berg_right x1150-1240 y400-440':(1150,400,1240,440),'far_bergs x1240-1440 y380-440':(1240,380,1440,440),'water_under_berg x950-1200 y458-480':(950,458,1200,480),'left_base x0-520 y420-460':(0,420,520,460),'ridge x0-100 y285-345':(0,285,100,345),'mtn_face x150-560 y250-330':(150,250,560,330)}
for k,(x0,y0,x1,y1) in B.items():
    vals=[box(i,x0,y0,x1,y1) for i in ims]
    print(f'{k:36s} REF {vals[0].round(0)} MAIN {vals[1].round(0)} LANE {vals[2].round(0)}  lapR {lap(ims[0][y0:y1,x0:x1]):.1f} lapM {lap(ims[1][y0:y1,x0:x1]):.1f} lapL {lap(ims[2][y0:y1,x0:x1]):.1f}')
