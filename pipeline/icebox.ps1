# Box stats of an ice-probe run (probe_icevar crops) on the round-5 ice judge's measurement boxes, converted to the
# crop coordinates (q00 / q01 clip x440 y130, q03 x470 y160, p06 x300 y0).
#   icebox.ps1 <probeOutDir>
param([string]$Dir)
$py = "python"
$bs = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad\pipeline\boxstats.py"
$sets = @{
  # ring top (680-760, 218-232) ref L192; bottom (680-760, 505-519) ref L191; left (578-592, 420-480) ref L194
  # + round 6: band A whole (540-905, 345-415) ref 185,205,232 (B-R 47)
  # + round 6: band A left TIR bar (585-593, 360-410) ref 125,155,193
  "q00" = "240,88,80,14;240,375,80,14;138,290,14,60;100,215,365,70;145,230,8,50";
  # ring A right edge-on band (805-835, 260-370): ref 140,168,204
  "q03" = "335,100,30,110";
  # centre ring lower body (480-840, 400-530): ref 204,223,237
  "p06" = "180,400,360,130";
}
foreach ($pose in $sets.Keys) {
  $files = Get-ChildItem $Dir -Filter "${pose}__*.png" | Sort-Object Name | ForEach-Object { $_.FullName }
  if (-not $files) { continue }
  "=== $pose"
  & $py $bs $sets[$pose] @files
}
