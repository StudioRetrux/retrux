# Converts the rendered plate / panorama into web assets in retrux-web/public/hero.
$sp = Split-Path -Parent $PSScriptRoot
$ff = "$sp\tools\node_modules\ffmpeg-static\ffmpeg.exe"
$out = "$sp\build"
$pub = "E:\Retrux Hero R&D\retrux-web\public\hero"

if (Test-Path "$out\plate_rest.png") {
  # 16-bit -> 8-bit with error-diffusion dither so the flat sky card never bands.
  $p = Start-Process -FilePath $ff -ArgumentList @("-hide_banner", "-loglevel", "error", "-y", "-i", "`"$out\plate_rest.png`"",
    "-sws_dither", "ed", "-vf", "format=rgb24", "-c:v", "libwebp", "-quality", "92", "-compression_level", "6", "`"$pub\plate_rest.webp`"") -NoNewWindow -Wait -PassThru
  "plate_rest.webp: exit $($p.ExitCode)  $([math]::Round((Get-Item "$pub\plate_rest.webp").Length/1KB)) KB"
  $info = Get-Content "$out\plate_rest.json" -Raw | ConvertFrom-Json
  $meta = [ordered]@{
    overscanX = $info.overscan.x
    overscanTop = $info.overscan.top
    overscanBottom = $info.overscan.bottom
    exposureStops = $info.png_exposure_stops
    width = $info.width
    height = $info.height
    note = "Cycles plate from the rest camera, hero hidden, calm water"
  }
  $meta | ConvertTo-Json | Set-Content -Path "$pub\plate.json" -Encoding utf8
  "plate.json:"; Get-Content "$pub\plate.json"
} else { "no plate_rest.png yet" }

if (Test-Path "$out\pano_orb.exr") {
  Copy-Item -LiteralPath "$out\pano_orb.exr" -Destination "$pub\pano_orb.exr" -Force
  "pano_orb.exr: $([math]::Round((Get-Item "$pub\pano_orb.exr").Length/1KB)) KB"
} else { "no pano yet" }
