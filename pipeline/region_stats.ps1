# Mean sRGB colour of named regions in two frames (engine vs reference), via ffmpeg area scaling.
#   region_stats.ps1 -A engine.png -B ref.png
param([string]$A, [string]$B)
$ff = "C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad\tools\node_modules\ffmpeg-static\ffmpeg.exe"
# name = w:h:x:y in 1440x766 pixels (rest camera framing)
$regions = [ordered]@{
  "sky top"        = "400:60:1000:10"
  "sky horizon"    = "200:40:1200:250"
  "left mountain"  = "120:90:10:200"
  "peak snow"      = "60:40:300:160"
  "iceberg right"  = "150:60:1000:330"
  "far floes"      = "300:30:500:470"
  "rock fg left"   = "200:80:30:640"
  "water near"     = "300:60:560:600"
  "corner TL"      = "160:60:0:0"
  "corner TR"      = "160:60:1280:0"
  "corner BL"      = "160:60:0:706"
  "corner BR"      = "160:60:1280:706"
  "mid left"       = "120:60:0:420"
  "mid right"      = "120:60:1320:420"
  "bottom centre"  = "200:50:620:716"
}
function Mean([string]$file, [string]$r) {
  $tmp = [IO.Path]::GetTempFileName()
  & $ff -y -loglevel error -i $file -vf "crop=$r,scale=1:1:flags=area" -f rawvideo -pix_fmt rgb24 $tmp
  $b = [IO.File]::ReadAllBytes($tmp); Remove-Item $tmp -Force
  return ,@($b[0], $b[1], $b[2])
}
"{0,-15} {1,-16} {2,-16} {3}" -f "region", "engine", "reference", "diff"
foreach ($k in $regions.Keys) {
  $ea = Mean $A $regions[$k]; $eb = Mean $B $regions[$k]
  $d = @(($ea[0] - $eb[0]), ($ea[1] - $eb[1]), ($ea[2] - $eb[2]))
  "{0,-15} {1,-16} {2,-16} {3}" -f $k, ($ea -join ","), ($eb -join ","), ($d -join ",")
}
