param()
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$weatherRoot = Split-Path $PSScriptRoot -Parent
$weatherSource = [System.Drawing.Image]::FromFile((Join-Path $weatherRoot 'public/assets/晴_日.png'))
function Save-MikuIcon([string]$Path, [int]$Size, [bool]$Transparent) {
    $canvas = [System.Drawing.Bitmap]::new($Size,$Size)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    try {
        $graphics.Clear($(if ($Transparent) { [System.Drawing.Color]::Transparent } else { [System.Drawing.ColorTranslator]::FromHtml('#163b38') }))
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $drawWidth = [int]($Size * $(if ($Transparent) { .63 } else { .83 }))
        $drawHeight = [int]($drawWidth * $weatherSource.Height / $weatherSource.Width)
        $graphics.DrawImage($weatherSource,[System.Drawing.Rectangle]::new([int](($Size-$drawWidth)/2),[int](($Size-$drawHeight)/2),$drawWidth,$drawHeight))
        $canvas.Save($Path,[System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $canvas.Dispose() }
}
try {
    foreach ($density in @(@('mdpi',48,108),@('hdpi',72,162),@('xhdpi',96,216),@('xxhdpi',144,324),@('xxxhdpi',192,432))) {
        $folder = Join-Path $weatherRoot ('android/app/src/main/res/mipmap-' + $density[0])
        Save-MikuIcon (Join-Path $folder 'ic_launcher.png') $density[1] $false
        Save-MikuIcon (Join-Path $folder 'ic_launcher_round.png') $density[1] $false
        Save-MikuIcon (Join-Path $folder 'ic_launcher_foreground.png') $density[2] $true
    }
    Save-MikuIcon (Join-Path $weatherRoot 'android/app/src/main/res/drawable/miku_splash.png') 288 $true
} finally {$weatherSource.Dispose()}
Write-Output 'Android 初音图标已生成'
