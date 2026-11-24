# v2 environment bake, one Blender at a time: scene prep -> rest plate strips -> hold plate strips -> stitch both
# -> orb panorama -> web proxies. Logs to <out>\status.txt. Skips finished pieces on a re-run.
param([int]$Strips = 4)
$sp = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad"
$out = "$sp\blend\v2build3"
$blend = "$sp\blend\plate_scene_v2.blend"
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$runner = "E:\Retrux Hero R&D\hero-pipeline\blender\run_blender.ps1"
New-Item -ItemType Directory -Force $out | Out-Null
$status = "$out\status.txt"
Add-Content $status "$(Get-Date -Format s) start"

function Run-Blender([string[]]$a, [string]$tag) {
  $p = Start-Process -FilePath $blender -ArgumentList $a -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$out\$tag.stdout.txt" -RedirectStandardError "$out\$tag.stderr.txt"
  Add-Content $status "$(Get-Date -Format s) $tag exit $($p.ExitCode)"
}

if (-not (Test-Path $blend) -or ((Get-Item $blend).LastWriteTime -lt (Get-Item "$sp\pipeline\prep_v2.py").LastWriteTime)) {
  Run-Blender @("-b", "`"$sp\assets_build\plate_scene.blend`"", "--python", "`"$sp\pipeline\prep_v2.py`"", "--", "`"$blend`"") "prep"
}
foreach ($cam in @("rest", "hold")) {
  for ($i = 0; $i -lt $Strips; $i++) {
    if (Test-Path "$out\plate_${cam}_s$i.exr") { Add-Content $status "$(Get-Date -Format s) skip $cam strip $i"; continue }
    Add-Content $status "$(Get-Date -Format s) begin $cam strip $i"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Blend $blend -Script "$sp\pipeline\render_plates_v2.py" -ArgString "$out|strip:${i}:$Strips|$cam" -LogDir $out | Add-Content $status
    if (-not (Test-Path "$out\plate_${cam}_s$i.exr")) { Add-Content $status "$(Get-Date -Format s) FAILED $cam strip $i"; exit 1 }
  }
  Run-Blender @("-b", "--factory-startup", "--python", "`"$sp\pipeline\stitch_plate_v2.py`"", "--", "`"$out`"", "$Strips", $cam) "stitch_$cam"
}
if (-not (Test-Path "$out\pano_orb.exr")) {
  Add-Content $status "$(Get-Date -Format s) begin pano"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Blend $blend -Script "$sp\pipeline\render_plates_v2.py" -ArgString "$out|pano|rest" -LogDir $out | Add-Content $status
}
Run-Blender @("-b", "`"$blend`"", "--python", "`"$sp\pipeline\export_env_v2.py`"", "--", "`"$out\env_proxy.glb`"") "export_env"
Add-Content $status "$(Get-Date -Format s) ALL_FINISHED"
