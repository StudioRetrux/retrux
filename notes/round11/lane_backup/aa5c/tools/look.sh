#!/bin/zsh
# raw frame dumps -> PNG (flipped), diff map x32 -> PNG, waterline crop 2x; counts differing pixels
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
cd $W/ident
A=$(ls look_lane_med_k*.rgba | head -1); B=$(ls look_mc0_med_k*.rgba | head -1)
node -e '
const fs=require("fs");const a=fs.readFileSync(process.argv[1]),b=fs.readFileSync(process.argv[2]);const d=Buffer.alloc(a.length);let n=0,mx=0;
for(let i=0;i<a.length;i+=4){let m=0;for(let c=0;c<3;c++){const v=Math.abs(a[i+c]-b[i+c]);m=Math.max(m,v);d[i+c]=Math.min(255,v*32);}d[i+3]=255;if(m>0)n++;mx=Math.max(mx,m);}
fs.writeFileSync(process.argv[3],d);console.log("pixels differing",n,"of",a.length/4,"max",mx);' $A $B diff_med.rgba
for f in $A $B diff_med.rgba; do /opt/homebrew/bin/ffmpeg -loglevel error -y -f rawvideo -pix_fmt rgba -s 1440x766 -i $f -vf vflip ../img/${f%.rgba}.png; done
/opt/homebrew/bin/ffmpeg -loglevel error -y -i ../img/${A%.rgba}.png -i ../img/${B%.rgba}.png -i ../img/diff_med.png -filter_complex "[0]crop=720:200:0:430[a];[1]crop=720:200:0:430[b];[2]crop=720:200:0:430[c];[a][b][c]vstack=3" ../img/look_med_k29_lane_mc0_diff32_crop.png
ls -la ../img/
