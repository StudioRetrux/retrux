# Publish the baked environment (bake_env_m8 / run_bake_m8) to retrux-web/public/hero: textures -> WebP (q90, ED-dithered
# from the 8-bit PNG), env_baked.glb, env_baked.json with the texture paths rewritten to baked/<name>.webp.
param([string]$Src = "", [int]$Quality = 90)
$sp = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad"
if (-not $Src) { $Src = "$sp\blend\v2build9\bake3" }
$pub = "E:\Retrux Hero R&D\retrux-web\public\hero"
$ff = "E:\Retrux Hero R&D\hero-pipeline\tools\node_modules\ffmpeg-static\ffmpeg.exe"
if (-not (Test-Path "$Src\env_baked.glb") -or -not (Test-Path "$Src\env_baked.json")) { "missing env_baked.glb / .json in $Src"; exit 1 }
New-Item -ItemType Directory -Force "$pub\baked" | Out-Null
$man = Get-Content "$Src\env_baked.json" -Raw | ConvertFrom-Json
$total = 0
foreach ($p in $man.objects.PSObject.Properties) {
  $o = $p.Value
  $png = Join-Path $Src ($o.texture -replace "/", "\")
  $name = [System.IO.Path]::GetFileNameWithoutExtension($png) + ".webp"
  $dst = "$pub\baked\$name"
  $proc = Start-Process -FilePath $ff -ArgumentList @("-hide_banner", "-loglevel", "error", "-y", "-i", "`"$png`"", "-c:v", "libwebp", "-quality", "$Quality", "-compression_level", "6", "`"$dst`"") -NoNewWindow -Wait -PassThru
  if ($proc.ExitCode -ne 0) { "webp failed: $png"; exit 1 }
  $o.texture = "baked/$name"
  $total += (Get-Item $dst).Length
}
Copy-Item "$Src\env_baked.glb" "$pub\env_baked.glb" -Force
$man | ConvertTo-Json -Depth 6 | Set-Content -Path "$pub\env_baked.json" -Encoding utf8
"textures " + [math]::Round($total / 1KB) + " KB, glb " + [math]::Round((Get-Item "$pub\env_baked.glb").Length / 1KB) + " KB, objects " + @($man.objects.PSObject.Properties).Count
