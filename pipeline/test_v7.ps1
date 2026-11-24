# v7 test: prep_v7 (v6 seam fix + far-left ridge heights x RIDGE_S) -> prep_v4b (lighter rock + snow streaks) -> a full-res
# crop render of the left third from the rest camera (ridge + massif foot), to compare with F000 / v2build5 plate_rest.
param([string]$RidgeS = "0.9", [string]$Streak = "0.5", [string]$RockK = "1.5", [string]$Tag = "a")
$sp = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad"
$out = "$sp\blend\v7test_$Tag"
New-Item -ItemType Directory -Force $out | Out-Null
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$runner = "E:\Retrux Hero R&D\hero-pipeline\blender\run_blender.ps1"
$st = "$out\status.txt"
Add-Content $st "$(Get-Date -Format s) start ridgeS $RidgeS streak $Streak"
$v7a = "$sp\blend\plate_scene_v7a.blend"
$v7 = "$sp\blend\plate_scene_v7.blend"
$p = Start-Process -FilePath $blender -ArgumentList @("-b", "`"$sp\assets_build\plate_scene.blend`"", "--python", "`"$sp\pipeline\prep_v7.py`"", "--", "`"$v7a`"", "1.53", "0.34", "0.038", "0.4", $RidgeS) -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$out\prep7.stdout.txt" -RedirectStandardError "$out\prep7.stderr.txt"
Add-Content $st "$(Get-Date -Format s) prep_v7 exit $($p.ExitCode)"
if (-not (Test-Path $v7a)) { Add-Content $st "FAILED prep_v7"; exit 1 }
$p = Start-Process -FilePath $blender -ArgumentList @("-b", "`"$v7a`"", "--python", "`"$sp\pipeline\prep_v4b.py`"", "--", "`"$v7`"", "-0.37", "-0.33", $Streak, $RockK) -PassThru -NoNewWindow -Wait -RedirectStandardOutput "$out\prep4b.stdout.txt" -RedirectStandardError "$out\prep4b.stderr.txt"
Add-Content $st "$(Get-Date -Format s) prep_v4b exit $($p.ExitCode)"
if (-not (Test-Path $v7)) { Add-Content $st "FAILED prep_v4b"; exit 1 }
& powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Blend $v7 -Script "$sp\pipeline\render_plates_v3.py" -ArgString "$out|crop:0.0:0.38:0.42:0.75|rest" -LogDir $out | Add-Content $st
Add-Content $st "$(Get-Date -Format s) ALL_FINISHED"
