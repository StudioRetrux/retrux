#!/bin/zsh
# BASE | AA3 | F1 | GT time slices, six boxes, slow and medium (rows: time down; columns: time across, sequences stacked)
C=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/caps; cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools; mkdir -p /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/img/final
for p in slow medium; do
  S=($C/${p}_base $C/${p}_F /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/${p}_F1 $C/${p}_gt)
  fsx0=$([ $p = slow ] && echo 280 || echo 330)
  node slice.mjs --row 690 --x0 $fsx0 --x1 385 --k0 0 --k1 239 --zoom 3 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/img/final/${p}_FS_row690.png ${S[@]}
  fsc=$([ $p = slow ] && echo 234 || echo 244)
  node cslice.mjs --col $fsc --y0 615 --y1 680 --k0 0 --k1 239 --zoom 3 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/img/final/${p}_FS_col${fsc}.png ${S[@]}
  node cslice.mjs --col 990 --y0 645 --y1 692 --k0 0 --k1 239 --zoom 3 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/img/final/${p}_WR_col990.png ${S[@]}
  drc=$([ $p = slow ] && echo 361 || echo 355)
  node cslice.mjs --col $drc --y0 700 --y1 760 --k0 0 --k1 239 --zoom 3 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/img/final/${p}_DR_col${drc}.png ${S[@]}
  node cslice.mjs --col 230 --y0 470 --y1 530 --k0 0 --k1 239 --zoom 3 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/img/final/${p}_FF_col230.png ${S[@]}
  node slice.mjs --row 505 --x0 150 --x1 300 --k0 0 --k1 239 --zoom 3 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/img/final/${p}_FF_row505.png ${S[@]}
  frc=$([ $p = slow ] && echo 917 || echo 1155)
  node cslice.mjs --col $frc --y0 465 --y1 520 --k0 0 --k1 239 --zoom 3 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/img/final/${p}_FR_col${frc}.png ${S[@]}
  node cslice.mjs --col 1015 --y0 605 --y1 660 --k0 0 --k1 239 --zoom 3 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/img/final/${p}_RS_col1015.png ${S[@]}
done
