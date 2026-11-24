# Baked environment, staged (one Blender session per stage / batch keeps memory flat on the 8 GB laptop):
#   prep (plate_scene_v7.blend -> <out>/bake_scene.blend), bake batches (bake_scene.blend), export (GLB + manifest).
param([string]$Out = "", [int]$Spp = 32, [int]$BatchSize = 6)
$sp = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad"
if (-not $Out) { $Out = "$sp\blend\v2build9\bake3" }
New-Item -ItemType Directory -Force $Out | Out-Null
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$script = "$sp\pipeline\bake_env_m8.py"
$status = "$Out\run_status.txt"
function Run($blend, $tag, [string[]]$extra) {
  $t0 = Get-Date
  $args1 = @("-b", "`"$blend`"", "--python", "`"$script`"", "--", "`"$Out`"", "spp=$Spp") + $extra
  $p = Start-Process -FilePath $blender -ArgumentList $args1 -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$Out\$tag.stdout.txt" -RedirectStandardError "$Out\$tag.stderr.txt"
  $line = "$(Get-Date -Format s) $tag exit $($p.ExitCode) $([int]((Get-Date) - $t0).TotalSeconds)s"
  Add-Content $status $line
  return $p.ExitCode
}
$objs = @('BG.001', 'gfsw.001', 'Object_2.009', 'Object_2.010', 'Plane.014', 'Plane.015', 'Retopo_Plane.005', 'Retopo_Plane.006', 'Retopo_Plane.007', 'Retopo_Plane.008', 'Retopo_Plane.009', 'Retopo_Plane.010', 'Retopo_Plane.011', 'Retopo_Plane.012', 'Rock.005', 'Rock.006', 'Rock.007', 'Rock.008', 'Rock.009', 'rock_big_1.001', 'rock_big_2.002', 'rock_big_2.003', 'rock_big_3.003', 'rock_big_3.004', 'rock_big_3.005', 'rock_big_4.003', 'rock_big_4.004', 'rock_big_4.005', 'rock_medium_1.001', 'rock_medium_2.001', 'rock_medium_3.002', 'rock_medium_3.003', 'V2_Massif', 'V2_Ridge')
if (-not (Test-Path "$Out\bake_scene.blend")) {
  $e = Run "$sp\blend\plate_scene_v7.blend" "prep" @("stage=prep")
  if (-not (Test-Path "$Out\bake_scene.blend")) { Add-Content $status "FAILED prep"; exit 1 }
}
$b = 0
for ($i = 0; $i -lt $objs.Count; $i += $BatchSize) {
  $batch = $objs[$i..([Math]::Min($i + $BatchSize, $objs.Count) - 1)]
  $tag = "bake_$b"
  if (-not (Test-Path "$Out\env_baked_$b.json")) {
    $e = Run "$Out\bake_scene.blend" $tag @("stage=bake", "batch=$b", "only=$($batch -join ',')")
    if (-not (Test-Path "$Out\env_baked_$b.json")) {
      # One retry (the watchdog may have stopped it); then go on.
      $e = Run "$Out\bake_scene.blend" "$tag-retry" @("stage=bake", "batch=$b", "only=$($batch -join ',')")
    }
  }
  $b++
}
$e = Run "$Out\bake_scene.blend" "export" @("stage=export")
Add-Content $status "$(Get-Date -Format s) DONE"
