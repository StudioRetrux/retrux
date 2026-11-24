#!/bin/zsh
# six time slices (one per box) for sequences given as args (BASE AA3 MINE GT ...), k0..k1, into OUTDIR with prefix
# usage: six.sh OUTDIR PREFIX K0 K1 SEQ...
O=$1; P=$2; K0=$3; K1=$4; shift 4
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4y/tools
node slice.mjs --row 690 --x0 340 --x1 400 --k0 $K0 --k1 $K1 --zoom 4 --out $O/${P}_FS_r690.png "$@" > /dev/null
node cslice.mjs --col 1030 --y0 660 --y1 686 --k0 $K0 --k1 $K1 --zoom 4 --out $O/${P}_WR_c1030.png "$@" > /dev/null
node cslice.mjs --col 360 --y0 696 --y1 714 --k0 $K0 --k1 $K1 --zoom 4 --out $O/${P}_DR_c360.png "$@" > /dev/null
node cslice.mjs --col 230 --y0 486 --y1 508 --k0 $K0 --k1 $K1 --zoom 4 --out $O/${P}_FF_c230.png "$@" > /dev/null
node cslice.mjs --col 1145 --y0 490 --y1 512 --k0 $K0 --k1 $K1 --zoom 4 --out $O/${P}_FR_c1145.png "$@" > /dev/null
node cslice.mjs --col 1105 --y0 606 --y1 632 --k0 $K0 --k1 $K1 --zoom 4 --out $O/${P}_RS_c1105.png "$@" > /dev/null
ls $O/${P}_*
