# One extra-projector plate (render_plates_v3.py CAMSEL) for the multi-projector environment: 4 strips + stitch into
# v2build3, same scene and settings as the other plates. Resumable (skips finished strips). One Blender at a time.
#   render_v3_cam.ps1 -Cam tilt
param([string]$Cam = "tilt", [int]$Strips = 4)
$sp = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad"
$out = "$sp\blend\v2build3"
$blend = "$sp\blend\plate_scene_v2.blend"
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$runner = "E:\Retrux Hero R&D\hero-pipeline\blender\run_blender.ps1"
$status = "$out\status_$Cam.txt"
Add-Content $status "$(Get-Date -Format s) start"
for ($i = 0; $i -lt $Strips; $i++) {
  if (Test-Path "$out\plate_${Cam}_s$i.exr") { Add-Content $status "$(Get-Date -Format s) skip $Cam strip $i"; continue }
  Add-Content $status "$(Get-Date -Format s) begin $Cam strip $i"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Blend $blend -Script "$sp\pipeline\render_plates_v3.py" -ArgString "$out|strip:${i}:$Strips|$Cam" -LogDir $out | Add-Content $status
  if (-not (Test-Path "$out\plate_${Cam}_s$i.exr")) { Add-Content $status "$(Get-Date -Format s) FAILED $Cam strip $i"; exit 1 }
}
$p = Start-Process -FilePath $blender -ArgumentList @("-b", "--factory-startup", "--python", "`"$sp\pipeline\stitch_plate_v2.py`"", "--", "`"$out`"", "$Strips", $Cam) -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$out\stitch_$Cam.stdout.txt" -RedirectStandardError "$out\stitch_$Cam.stderr.txt"
Add-Content $status "$(Get-Date -Format s) stitch $Cam exit $($p.ExitCode)"
Add-Content $status "$(Get-Date -Format s) ALL_FINISHED"
