#!/bin/zsh
# Publish the baked environment v9 (replaces finalize_bake_m8.ps1): encode the compositor's EXR textures in the plates'
# encoding (encode_env_m9.py: Standard view, exposure -2.158, 16-bit PNG, ED-dithered WebP q92) and copy env_baked.glb,
# env_baked.json and baked/*.webp into the web app's public/hero. Every projected asset stays (`?env=projected`).
#   [WISP_CARD=.. WISP_META=.. WISP_KEEP=..] finalize_bake_m9.zsh <bakeDir> <public/hero dir> [q=92]
set -eu
here=${0:A:h}
src=${1:?bake dir}
pub=${2:?public/hero dir}
shift 2
BPY=${BPY:-/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13}
FF=${FF:?set FF to an ffmpeg with libwebp (hero-pipeline/tools/node_modules/ffmpeg-static/ffmpeg)}
[[ -f "$src/env_baked.glb" ]] || { echo "missing $src/env_baked.glb"; exit 1; }
"$BPY" -I "$here/encode_env_m9.py" "$src" "$FF" "$@"
# Round 11 step 2: the summit wisp card and the way-back textures (WISP_CARD / WISP_META: render_sky_equirect.py's card and its
# json; WISP_KEEP: the folder of the previous webps that still contain the wisp, e.g. WORK/bake9/webp).
if [[ -n "${WISP_CARD:-}" ]]; then
  "$BPY" -I "$here/encode_wisp_m9.py" "$src" "$WISP_CARD" "${WISP_META:?set WISP_META}" ${WISP_KEEP:+keep=$WISP_KEEP}
fi
mkdir -p "$pub/baked"
rm -f "$pub"/baked/*.webp(N)
cp "$src/webp/"*.webp "$pub/baked/"
cp "$src/env_baked.glb" "$pub/env_baked.glb"
cp "$src/env_baked.json" "$pub/env_baked.json"
# Round 11 step 2: the summit wisp card (encode_wisp_m9.py), when the bake has one.
[[ -f "$src/wisp_card.exr" ]] && cp "$src/wisp_card.exr" "$pub/wisp_card.exr"
echo "published: textures $(du -ck "$pub/baked/"*.webp | tail -1 | cut -f1) KB, glb $(( $(stat -f%z "$pub/env_baked.glb") / 1024 )) KB"
