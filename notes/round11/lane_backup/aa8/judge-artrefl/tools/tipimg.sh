#!/bin/zsh
# tip spot strips (AR-1 b / RC-1): A8 | A7 | BASE
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/artrefl/tools; C=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/artrefl/caps; I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/artrefl/img
case $1 in
gov1) node strip.mjs --crop 100,485,260,525 --k0 62 --k1 90 --step 2 --zoom 5 --out $I/gov1_tip_k62-90_x100-260_A8_A7_BASE1_z5.png $C/gov1/a8 $C/gov1/a7 /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/caps/gov1/base1
      node strip.mjs --crop 0,440,720,600 --k0 70 --k1 78 --step 4 --zoom 1 --out $I/gov1_k70-78_x0-720_A8_A7_z1.png $C/gov1/a8 $C/gov1/a7 ;;
gov)  node strip.mjs --crop 80,480,300,530 --k0 61 --k1 93 --step 2 --zoom 3 --out $I/gov_red_k61-93_x80-300_A8_A7_BASE_z3.png $C/gov/a8 $C/gov/a7 $C/gov/base
      node strip.mjs --crop 0,440,720,600 --k0 88 --k1 92 --step 2 --zoom 1 --out $I/gov_s07_k88-92_x0-720_A8_A7_BASE_z1.png $C/gov/a8 $C/gov/a7 $C/gov/base ;;
holdre) node strip.mjs --crop 90,585,230,625 --k0 201 --k1 211 --step 1 --zoom 4 --out $I/holdre_k201-211_x90-230_A8_A7_BASE_z4.png $C/holdre/a8 $C/holdre/a7 $C/holdre/base
      node strip.mjs --crop 0,520,720,700 --k0 203 --k1 209 --step 3 --zoom 1 --out $I/holdre_k203-209_x0-720_A8_A7_BASE_z1.png $C/holdre/a8 $C/holdre/a7 $C/holdre/base ;;
esac
