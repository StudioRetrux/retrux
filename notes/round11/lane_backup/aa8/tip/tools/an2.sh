#!/bin/zsh
# AA8 tip: event cases (after c8): hold pops (BASE as reference, as the art judge), gov1 / gov / hold spot numbers + strips
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/tip; T=$W/tools/ar; R=$SP/work7/recheck/caps
until grep -q "^holdF" $W/logs/c8.log; do sleep 3; done
{
echo "### hold (jcap holdre rows 380-766; mask + reference = BASE :5182 in the same session; a7 = :5197)"
node $W/tools/capcmp.mjs $W/caps/holdF/tip2 $W/caps/holdF/a7 8
node $T/popscan.mjs --mask $W/caps/holdF/base --gt $W/caps/holdF/base --thr 40 A7=$W/caps/holdF/a7 TIP=$W/caps/holdF/tip2 --top 6 2>&1
echo "-- popnew TIP vs A7 (new pops)"; node $T/popnew.mjs --mask $W/caps/holdF/base --gt $W/caps/holdF/base --x $W/caps/holdF/tip2 --ref $W/caps/holdF/a7 --top 8
echo "-- popnew A7 vs TIP (pops TIP removes)"; node $T/popnew.mjs --mask $W/caps/holdF/base --gt $W/caps/holdF/base --x $W/caps/holdF/a7 --ref $W/caps/holdF/tip2 --top 4
echo "### tip box changes (x40-320; gov y485-525, hold y590-625), T8"
node $T/boxsplit.mjs $W/caps/gov1/tip2 $R/gov1/fin1 8 40,485,320,525
node $T/boxsplit.mjs $W/caps/gov/tip2 $R/gov/fin 8 40,485,320,525
node $T/boxsplit.mjs $W/caps/holdF/tip2 $W/caps/holdF/a7 8 40,590,320,625
echo "### toward the 2x-rows image (fftip=0 + ?lkmscale=0.5,1)"
node $T/toward.mjs $W/caps/gov1/tip2 $R/gov1/fin1 $W/caps/gov1/r2 8 40,485,320,525
} > $W/ana/events.txt 2>&1
cd $T
node strip.mjs --crop 110,488,250,520 --k0 62 --k1 90 --step 4 --zoom 5 --out $W/img/gov1_tip_k62-90_x110-250_A7_TIP_R2_BASE_z5.png $R/gov1/fin1 $W/caps/gov1/tip2 $W/caps/gov1/r2 $R/gov1/base1
node strip.mjs --crop 40,470,360,530 --k0 66 --k1 86 --step 4 --zoom 2 --out $W/img/gov1_tip_k66-86_x40-360_A7_TIP_BASE_z2.png $R/gov1/fin1 $W/caps/gov1/tip2 $R/gov1/base1
node strip.mjs --crop 0,440,720,600 --k0 70 --k1 82 --step 12 --zoom 1 --out $W/img/gov1_k70-82_x0-720_A7_TIP_z1.png $R/gov1/fin1 $W/caps/gov1/tip2
node strip.mjs --crop 80,485,300,525 --k0 61 --k1 93 --step 4 --zoom 4 --out $W/img/gov_red_k61-93_x80-300_A7_TIP_BASE_z4.png $R/gov/fin $W/caps/gov/tip2 $R/gov/base
node strip.mjs --crop 90,592,230,625 --k0 199 --k1 213 --step 2 --zoom 4 --out $W/img/holdre_k199-213_x90-230_A7_TIP_BASE_z4.png $W/caps/holdF/a7 $W/caps/holdF/tip2 $W/caps/holdF/base
node strip.mjs --crop 0,560,720,660 --k0 205 --k1 209 --step 4 --zoom 1 --out $W/img/holdre_k205-209_x0-720_A7_TIP_z1.png $W/caps/holdF/a7 $W/caps/holdF/tip2
echo "an2 done $(date +%T)"
