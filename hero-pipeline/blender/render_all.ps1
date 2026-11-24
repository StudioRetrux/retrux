# Sequential plate pipeline: N border strips -> stitch -> panorama. One Blender at a time.
param([int]$Strips = 4)
$sp = Split-Path -Parent $PSScriptRoot
$out = "$sp\build"
$runner = "$PSScriptRoot\run_blender.ps1"
$status = "$out\render_all_status.txt"
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
Set-Content $status "$(Get-Date -Format s) start ($Strips strips)"
for ($i = 0; $i -lt $Strips; $i++) {
  if (Test-Path "$out\plate_rest_s$i.exr") { Add-Content $status "$(Get-Date -Format s) skip strip $i (exists)"; continue }
  Add-Content $status "$(Get-Date -Format s) begin strip $i"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Blend "$out\plate_scene.blend" -Script "$PSScriptRoot\render_plates.py" -ArgString "$out|strip:${i}:$Strips" | Add-Content $status
  if (-not (Test-Path "$out\plate_rest_s$i.exr")) { Add-Content $status "$(Get-Date -Format s) FAILED strip $i"; exit 1 }
  Add-Content $status "$(Get-Date -Format s) done strip $i"
}
Add-Content $status "$(Get-Date -Format s) begin stitch"
Start-Process -FilePath $blender -ArgumentList @("-b", "--factory-startup", "--python", "`"$PSScriptRoot\stitch_plate.py`"", "--", "`"$out`"", "$Strips") -PassThru -NoNewWindow -Wait `
  -RedirectStandardOutput "$out\stitch.stdout.txt" -RedirectStandardError "$out\stitch.stderr.txt" | Out-Null
Get-Content "$out\stitch.stdout.txt", "$out\stitch.stderr.txt" | Select-String "strip |STITCH_DONE|Error|Traceback" | ForEach-Object { $_.Line } | Add-Content $status
if (-not (Test-Path "$out\pano_orb.exr")) {
  Add-Content $status "$(Get-Date -Format s) begin pano"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Blend "$out\plate_scene.blend" -Script "$PSScriptRoot\render_plates.py" -ArgString "$out|pano" | Add-Content $status
}
Add-Content $status "$(Get-Date -Format s) ALL_FINISHED"

