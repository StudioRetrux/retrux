# Runs one headless Blender job on the project .blend with the laptop-safety rules:
# refuses to start below 1500 MB available RAM, 2 render threads, BelowNormal priority,
# tracks the lowest available RAM during the run. The RAM watchdog is the hard stop.
param(
  [Parameter(Mandatory = $true)][string]$Script,
  # "|"-separated, because powershell.exe -File passes arrays as one string
  [Parameter(Mandatory = $true)][string]$ArgString,
  [string]$Blend = "E:\Retrux Hero R&D\Home - EXPORT.blend",
  [string]$LogDir = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad\assets_build"
)
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$pc = New-Object System.Diagnostics.PerformanceCounter("Memory", "Available MBytes")
$avail = [int]$pc.NextValue()
"available before: ${avail}MB"
if ($avail -lt 1500) { "ABORT: not enough free RAM"; exit 1 }
New-Item -ItemType Directory -Force $LogDir | Out-Null
$ScriptArgs = $ArgString -split '\|'
$tag = [IO.Path]::GetFileNameWithoutExtension($Script) + "_" + ($ScriptArgs[-1] -replace '[^\w]', '')
$argList = @("-b", "--factory-startup", "-t", "3", "`"$Blend`"", "--python", "`"$Script`"", "--") + ($ScriptArgs | ForEach-Object { "`"$_`"" })
$p = Start-Process -FilePath $blender -ArgumentList $argList -PassThru -NoNewWindow `
  -RedirectStandardOutput (Join-Path $LogDir "$tag.stdout.txt") -RedirectStandardError (Join-Path $LogDir "$tag.stderr.txt")
Start-Sleep -Milliseconds 500
try { $p.PriorityClass = 'BelowNormal' } catch {}
$minAvail = 99999
while (-not $p.HasExited) {
  Start-Sleep -Seconds 2
  $a = [int]$pc.NextValue()
  if ($a -lt $minAvail) { $minAvail = $a }
}
"exit code: $($p.ExitCode)  min available during run: ${minAvail}MB"
Get-Content (Join-Path $LogDir "$tag.stderr.txt") -Tail 10 -ErrorAction SilentlyContinue
