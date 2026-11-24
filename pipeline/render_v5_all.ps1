# Environment v5 (v4 + the dark far-left ridge, prep_v4.py; the blend must exist) (= prep_v3 base mist: lower, dimmer, bluer) for every projector: builds plate_scene_v3.blend from the
# decimated plate scene, renders rest / hold / orbN / orbP / tilt (4 strips each, resumable) into v2build4 and stitches.
# One Blender at a time; ~3 h. Publish afterwards with finalize (v2build4) after a visual check.
param([int]$Strips = 4, [string[]]$Cams = @("rest", "tilt", "orbN", "orbP", "hold"))
$sp = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad"
$out = "$sp\blend\v2build5"
New-Item -ItemType Directory -Force $out | Out-Null
$blend = "$sp\blend\plate_scene_v4.blend"
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$runner = "E:\Retrux Hero R&D\hero-pipeline\blender\run_blender.ps1"
$status = "$out\status.txt"
Add-Content $status "$(Get-Date -Format s) start"
if (-not (Test-Path $blend)) {
  $p = Start-Process -FilePath $blender -ArgumentList @("-b", "`"$sp\assets_build\plate_scene.blend`"", "--python", "`"$sp\pipeline\prep_v3.py`"", "--", "`"$blend`"") -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$out\prep.stdout.txt" -RedirectStandardError "$out\prep.stderr.txt"
  Add-Content $status "$(Get-Date -Format s) prep exit $($p.ExitCode)"
  if (-not (Test-Path $blend)) { Add-Content $status "$(Get-Date -Format s) FAILED prep"; exit 1 }
}
foreach ($cam in $Cams) {
  for ($i = 0; $i -lt $Strips; $i++) {
    if (Test-Path "$out\plate_${cam}_s$i.exr") { Add-Content $status "$(Get-Date -Format s) skip $cam strip $i"; continue }
    Add-Content $status "$(Get-Date -Format s) begin $cam strip $i"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Blend $blend -Script "$sp\pipeline\render_plates_v3.py" -ArgString "$out|strip:${i}:$Strips|$cam" -LogDir $out | Add-Content $status
    if (-not (Test-Path "$out\plate_${cam}_s$i.exr")) { Add-Content $status "$(Get-Date -Format s) FAILED $cam strip $i"; exit 1 }
  }
  if (-not (Test-Path "$out\plate_$cam.png")) {
    $p = Start-Process -FilePath $blender -ArgumentList @("-b", "--factory-startup", "--python", "`"$sp\pipeline\stitch_plate_v2.py`"", "--", "`"$out`"", "$Strips", $cam) -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$out\stitch_$cam.stdout.txt" -RedirectStandardError "$out\stitch_$cam.stderr.txt"
    Add-Content $status "$(Get-Date -Format s) stitch $cam exit $($p.ExitCode)"
  }
  Add-Content $status "$(Get-Date -Format s) done $cam"
}
Add-Content $status "$(Get-Date -Format s) ALL_FINISHED"

