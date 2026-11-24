# v6 seam test: prep_v6 (centroid split + faded massif turn) -> prep_v4 (dark ridge, v5 mask) -> a full-res crop render of
# the massif foot from the rest camera (compare with blend\v2build5\plate_rest.png). One Blender at a time.
$sp = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad"
$out = "$sp\blend\v6test"
New-Item -ItemType Directory -Force $out | Out-Null
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$runner = "E:\Retrux Hero R&D\hero-pipeline\blender\run_blender.ps1"
$st = "$out\status.txt"
Add-Content $st "$(Get-Date -Format s) start"
$v6a = "$sp\blend\plate_scene_v6a.blend"
$v6 = "$sp\blend\plate_scene_v6.blend"
$p = Start-Process -FilePath $blender -ArgumentList @("-b", "`"$sp\assets_build\plate_scene.blend`"", "--python", "`"$sp\pipeline\prep_v6.py`"", "--", "`"$v6a`"") -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$out\prep6.stdout.txt" -RedirectStandardError "$out\prep6.stderr.txt"
Add-Content $st "$(Get-Date -Format s) prep_v6 exit $($p.ExitCode)"
if (-not (Test-Path $v6a)) { Add-Content $st "FAILED prep_v6"; exit 1 }
$p = Start-Process -FilePath $blender -ArgumentList @("-b", "`"$v6a`"", "--python", "`"$sp\pipeline\prep_v4.py`"", "--", "`"$v6`"", "-0.37", "-0.33") -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$out\prep4.stdout.txt" -RedirectStandardError "$out\prep4.stderr.txt"
Add-Content $st "$(Get-Date -Format s) prep_v4 exit $($p.ExitCode)"
if (-not (Test-Path $v6)) { Add-Content $st "FAILED prep_v4"; exit 1 }
& powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Blend $v6 -Script "$sp\pipeline\render_plates_v3.py" -ArgString "$out|crop:0.2:0.4:0.4:0.53|rest" -LogDir $out | Add-Content $st
Add-Content $st "$(Get-Date -Format s) ALL_FINISHED"
