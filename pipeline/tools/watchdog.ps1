# RAM watchdog for the Retrux hero work on an 8 GB laptop.
# - Keeps our heavy jobs (Blender, Python, ffmpeg) at BelowNormal priority.
# - When "Available MBytes" drops below $MinAvailMB, kills only the processes this
#   work starts: blender/python/ffmpeg, automation Chrome (playwright/headless/
#   retrux-lab profile) and our node jobs (next dev, gltf-transform, esbuild,
#   scratchpad scripts). MCP servers, Adobe, the IDE and Claude are never touched.
#   -AwakeUntil <ISO time>: also keeps Windows from idle-sleeping until then (overnight
#   unattended work); released automatically at that time or when this process exits.
param([int]$MinAvailMB = 700, [string]$AwakeUntil = '')

$ErrorActionPreference = 'SilentlyContinue'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $dir 'watchdog.log'
$hb = Join-Path $dir 'watchdog.heartbeat'
Set-Content -Path (Join-Path $dir 'watchdog.pid') -Value $PID

$me = [System.Diagnostics.Process]::GetCurrentProcess()
$me.PriorityClass = 'AboveNormal'
$pc = New-Object System.Diagnostics.PerformanceCounter('Memory', 'Available MBytes')
Add-Content -Path $log -Value "$(Get-Date -Format s) START pid=$PID min=${MinAvailMB}MB"

# ES_CONTINUOUS | ES_SYSTEM_REQUIRED (no display flag: the screen may still turn off).
Add-Type -Namespace RxWd -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
$awake = $false
$awakeUntilDt = $null
if ($AwakeUntil) { $awakeUntilDt = [datetime]::Parse($AwakeUntil) }
if ($awakeUntilDt -and (Get-Date) -lt $awakeUntilDt) {
  $r = [RxWd.Power]::SetThreadExecutionState([uint32]2147483649)
  $awake = $r -ne 0
  Add-Content -Path $log -Value "$(Get-Date -Format s) KEEPAWAKE on=$awake until=$AwakeUntil"
}

$tick = 0
while ($true) {
  $avail = [int]$pc.NextValue()
  $tick++
  if ($awake -and (Get-Date) -ge $awakeUntilDt) {
    [void][RxWd.Power]::SetThreadExecutionState([uint32]2147483648)
    $awake = $false
    Add-Content -Path $log -Value "$(Get-Date -Format s) KEEPAWAKE off"
  }
  if ($tick % 15 -eq 0) { Set-Content -Path $hb -Value "$(Get-Date -Format s) avail=${avail}MB awake=$awake" }
  if ($tick % 60 -eq 0) { [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers() }

  foreach ($p in @(Get-Process -Name blender, python, ffmpeg)) {
    if ($p.PriorityClass -eq 'Normal' -or $p.PriorityClass -eq 'AboveNormal' -or $p.PriorityClass -eq 'High') {
      try { $p.PriorityClass = 'BelowNormal' } catch {}
    }
  }

  if ($avail -lt $MinAvailMB) {
    $victims = @(Get-Process -Name blender, python, ffmpeg)
    foreach ($w in @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='node.exe'")) {
      $cl = [string]$w.CommandLine
      if ($cl -match 'chrome-devtools-mcp' -or $cl -match 'Adobe') { continue }
      $isOurChrome = ($w.Name -eq 'chrome.exe') -and ($cl -match 'playwright|--headless|retrux-lab')
      $isOurNode = ($w.Name -eq 'node.exe') -and ($cl -match 'next|gltf-transform|esbuild|scratchpad|retrux')
      if ($isOurChrome -or $isOurNode) { $victims += Get-Process -Id $w.ProcessId }
    }
    foreach ($v in $victims) {
      try {
        Stop-Process -Id $v.Id -Force -ErrorAction Stop
        Add-Content -Path $log -Value "$(Get-Date -Format s) KILLED $($v.ProcessName) pid=$($v.Id) avail=${avail}MB"
      } catch {}
    }
    Start-Sleep -Seconds 3
  }
  Start-Sleep -Milliseconds 1000
}
