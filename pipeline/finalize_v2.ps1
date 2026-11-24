# v2 environment -> retrux-web/public/hero: plates (rest + extra projectors), metadata, orb panorama, proxies.
# Backs up the published files first (once). Only the pieces that exist in v2build are published.
param([string[]]$Cams = @("rest", "hold", "orbN", "orbP"))
$sp = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad"
$ff = "E:\Retrux Hero R&D\hero-pipeline\tools\node_modules\ffmpeg-static\ffmpeg.exe"
$out = "$sp\blend\v2build3"
$pub = "E:\Retrux Hero R&D\retrux-web\public\hero"
$bak = "$sp\qc\backup\2026-11-12_public_hero_v1"
if (-not (Test-Path $bak)) {
  New-Item -ItemType Directory -Force $bak | Out-Null
  foreach ($f in @("plate_rest.webp", "plate.json", "pano_orb.exr", "env_proxy.glb")) { if (Test-Path "$pub\$f") { Copy-Item "$pub\$f" "$bak\$f" } }
  "backed up the v1 environment to $bak"
}
foreach ($cam in $Cams) {
  $png = "$out\plate_$cam.png"
  if (-not (Test-Path $png)) { "no $png"; continue }
  $webp = if ($cam -eq "rest") { "plate_rest.webp" } else { "plate_$cam.webp" }
  $json = if ($cam -eq "rest") { "plate.json" } else { "plate_$cam.json" }
  # 16-bit -> 8-bit with error-diffusion dither so the flat sky never bands.
  $p = Start-Process -FilePath $ff -ArgumentList @("-hide_banner", "-loglevel", "error", "-y", "-i", "`"$png`"",
    "-sws_dither", "ed", "-vf", "format=rgb24", "-c:v", "libwebp", "-quality", "92", "-compression_level", "6", "`"$pub\$webp`"") -NoNewWindow -Wait -PassThru
  "$webp exit $($p.ExitCode) $([math]::Round((Get-Item "$pub\$webp").Length/1KB)) KB"
  $info = Get-Content "$out\plate_$cam.json" -Raw | ConvertFrom-Json
  $meta = [ordered]@{
    overscanX = $info.overscan.x
    overscanTop = $info.overscan.top
    overscanBottom = $info.overscan.bottom
    exposureStops = $info.png_exposure_stops
    width = $info.width
    height = $info.height
    note = "Cycles plate ($cam camera), hero hidden, calm water, v2 environment (massif moved, volumetric mist)"
  }
  $meta | ConvertTo-Json | Set-Content -Path "$pub\$json" -Encoding utf8
}
if (Test-Path "$out\pano_orb.exr") { Copy-Item -LiteralPath "$out\pano_orb.exr" -Destination "$pub\pano_orb.exr" -Force; "pano_orb.exr published" }
if (Test-Path "$out\env_proxy.glb") { Copy-Item -LiteralPath "$out\env_proxy.glb" -Destination "$pub\env_proxy.glb" -Force; "env_proxy.glb published $([math]::Round((Get-Item "$pub\env_proxy.glb").Length/1KB)) KB" }
