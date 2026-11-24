W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4wl
node $W/tools/cap.mjs --port 5163 --path fast --frames 60 --pre 20 --vw 1512 --vh 860 --dsf 2 --tier T1 --rows 480,640,860 --out $W/caps/f_t1d2 | tail -1
node $W/tools/cap.mjs --port 5163 --path fast --frames 60 --pre 20 --vw 1512 --vh 860 --dsf 1 --tier T1 --rows 480,640,860 --out $W/caps/f_t1d1 | tail -1
node $W/tools/cap.mjs --port 5163 --path fast --frames 60 --pre 20 --vw 1512 --vh 860 --dsf 2 --tier T2 --rows 480,640,860 --out $W/caps/f_t2 | tail -1
