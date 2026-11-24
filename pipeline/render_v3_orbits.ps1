# Orbit-extreme plates (orbN / orbP) for the multi-projector environment, after the v2 chain: waits for
# ALL_FINISHED in v2build\status.txt (one Blender at a time), then renders 4 strips per camera and stitches.
param([int]$Strips = 4)
$sp = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad"
$out = "$sp\blend\v2build3"
$blend = "$sp\blend\plate_scene_v2.blend"
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$runner = "E:\Retrux Hero R&D\hero-pipeline\blender\run_blender.ps1"
$status = "$out\status_v3.txt"
Add-Content $status "$(Get-Date -Format s) waiting for the v2 chain"
# The v2 chain may have been cut off by its launcher: wait until Blender has been idle for a minute, then run the
# v2 chain again here (it skips every finished strip) so its stitch / pano / proxy steps are complete, then the orbits.
$idle = 0
while ($true) {
  $done = $false
  try { $done = (Get-Content "$out\status.txt" -ErrorAction Stop | Select-String "ALL_FINISHED") -ne $null } catch {}
  if (Get-Process blender -ErrorAction SilentlyContinue) { $idle = 0 } else { $idle += 20 }
  # The orbit plates start only once the rest + hold projectors are verified (flag file "go_orbits").
  if ($done -and $idle -ge 20 -and (Test-Path "$out\go_orbits")) { break }
  if (-not $done -and $idle -ge 60) {
    Add-Content $status "$(Get-Date -Format s) v2 chain not finished and Blender idle: resuming it"
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$sp\pipeline\render_v2_all.ps1"
    continue
  }
  Start-Sleep -Seconds 20
}
Add-Content $status "$(Get-Date -Format s) start"
foreach ($cam in @("orbN", "orbP")) {
  for ($i = 0; $i -lt $Strips; $i++) {
    if (Test-Path "$out\plate_${cam}_s$i.exr") { Add-Content $status "$(Get-Date -Format s) skip $cam strip $i"; continue }
    Add-Content $status "$(Get-Date -Format s) begin $cam strip $i"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Blend $blend -Script "$sp\pipeline\render_plates_v3.py" -ArgString "$out|strip:${i}:$Strips|$cam" -LogDir $out | Add-Content $status
    if (-not (Test-Path "$out\plate_${cam}_s$i.exr")) { Add-Content $status "$(Get-Date -Format s) FAILED $cam strip $i"; exit 1 }
  }
  $p = Start-Process -FilePath $blender -ArgumentList @("-b", "--factory-startup", "--python", "`"$sp\pipeline\stitch_plate_v2.py`"", "--", "`"$out`"", "$Strips", $cam) -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$out\stitch_$cam.stdout.txt" -RedirectStandardError "$out\stitch_$cam.stderr.txt"
  Add-Content $status "$(Get-Date -Format s) stitch $cam exit $($p.ExitCode)"
}
Add-Content $status "$(Get-Date -Format s) ALL_FINISHED"
