param([string]$OutputDirectory = 'qa/widget-preview')
$ErrorActionPreference = 'Stop'
$mikuRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not [IO.Path]::IsPathRooted($OutputDirectory)) { $OutputDirectory = Join-Path $mikuRoot $OutputDirectory }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$mikuClasses = Join-Path $OutputDirectory 'classes'
New-Item -ItemType Directory -Path $mikuClasses -Force | Out-Null
& javac.exe -encoding UTF-8 -d $mikuClasses (Join-Path $mikuRoot 'android/app/src/main/java/io/mikuweather/reborn/WidgetCardLayout.java') (Join-Path $PSScriptRoot 'preview/WidgetPreviewPlan.java')
if ($LASTEXITCODE -ne 0) { throw '尺寸预算编译失败' }
Add-Type -AssemblyName System.Drawing
$script:mikuScale = 2.0
$script:mikuCanvas = [Drawing.Bitmap]::new(1140, 1440)
$script:mikuGraphics = [Drawing.Graphics]::FromImage($script:mikuCanvas)
$script:mikuGraphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$script:mikuGraphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$mikuWallpaper = [Drawing.Drawing2D.LinearGradientBrush]::new([Drawing.Rectangle]::new(0,0,1140,1440), [Drawing.ColorTranslator]::FromHtml('#20464F'), [Drawing.ColorTranslator]::FromHtml('#42635D'), 60.0)
$script:mikuGraphics.FillRectangle($mikuWallpaper,0,0,1140,1440)
$mikuWallpaper.Dispose()

function Write-MikuText([string]$Text, [float]$X, [float]$Y, [float]$Size, [string]$Color, [float]$Width, [float]$Height, [bool]$Bold = $false, [string]$Family = 'Microsoft YaHei UI') {
    $font = [Drawing.Font]::new($Family, $Size * $script:mikuScale, $(if($Bold){[Drawing.FontStyle]::Bold}else{[Drawing.FontStyle]::Regular}), [Drawing.GraphicsUnit]::Pixel)
    $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($Color))
    $format = [Drawing.StringFormat]::new()
    $format.FormatFlags = [Drawing.StringFormatFlags]::NoWrap
    $format.Trimming = [Drawing.StringTrimming]::EllipsisCharacter
    $rect = [Drawing.RectangleF]::new($X,$Y,$Width,$Height)
    $script:mikuGraphics.DrawString($Text,$font,$brush,$rect,$format)
    $format.Dispose(); $font.Dispose(); $brush.Dispose()
}
function New-MikuRoundPath([Drawing.RectangleF]$Rect, [float]$Radius) {
    $path = [Drawing.Drawing2D.GraphicsPath]::new()
    $d = $Radius * 2
    $path.AddArc($Rect.X,$Rect.Y,$d,$d,180,90)
    $path.AddArc($Rect.Right-$d,$Rect.Y,$d,$d,270,90)
    $path.AddArc($Rect.Right-$d,$Rect.Bottom-$d,$d,$d,0,90)
    $path.AddArc($Rect.X,$Rect.Bottom-$d,$d,$d,90,90)
    $path.CloseFigure()
    return $path
}
function Draw-MikuImage([string]$Path, [Drawing.RectangleF]$Box, [bool]$Crop) {
    $picture = [Drawing.Image]::FromFile($Path)
    $state = $script:mikuGraphics.Save()
    $script:mikuGraphics.SetClip($Box)
    $ratio = if($Crop){[Math]::Max($Box.Width/$picture.Width,$Box.Height/$picture.Height)}else{[Math]::Min($Box.Width/$picture.Width,$Box.Height/$picture.Height)}
    $drawWidth = $picture.Width * $ratio; $drawHeight = $picture.Height * $ratio
    $target = [Drawing.RectangleF]::new($Box.X+($Box.Width-$drawWidth)/2,$Box.Y+($Box.Height-$drawHeight)/2,$drawWidth,$drawHeight)
    $script:mikuGraphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $script:mikuGraphics.DrawImage($picture,$target)
    $script:mikuGraphics.Restore($state)
    $picture.Dispose()
}
function Draw-MikuCard([int]$X,[int]$Y,[int]$Width,[int]$Height,[bool]$Compact,[bool]$Night,[float]$FontScale,[string]$Temperature,[string]$Title) {
    $p = (& java.exe -cp $mikuClasses io.mikuweather.reborn.WidgetPreviewPlan $Compact.ToString().ToLowerInvariant() $Width $Height $FontScale.ToString([Globalization.CultureInfo]::InvariantCulture) $Temperature) | ConvertFrom-Json
    if($LASTEXITCODE -ne 0){throw '尺寸预算读取失败'}
    $s=$script:mikuScale
    Write-MikuText $Title $X ($Y-37) 12 '#DCF3ED' ($Width*$s) 32 $true
    $rect=[Drawing.RectangleF]::new($X,$Y,$Width*$s,$Height*$s)
    $round=New-MikuRoundPath $rect (22*$s)
    $start=if($Night){[Drawing.Color]::FromArgb(230,25,55,66)}else{[Drawing.Color]::FromArgb(230,239,250,247)}
    $end=if($Night){[Drawing.Color]::FromArgb(222,18,42,53)}else{[Drawing.Color]::FromArgb(222,214,238,235)}
    $card=[Drawing.Drawing2D.LinearGradientBrush]::new($rect,$end,$start,0.0)
    $script:mikuGraphics.FillPath($card,$round)
    $card.Dispose(); $round.Dispose()
    $primary=if($Night){'#F2F8F9'}else{'#163A40'}
    $secondary=if($Night){'#B4CDD2'}else{'#4A747A'}
    $accent=if($Night){'#88E3D5'}else{'#087F7E'}
    $pad=$p.padding*$s; $cx=$X+$pad; $cy=$Y+$pad; $cw=($Width-2*$p.padding)*$s
    $header=$p.city*1.22*$s
    $clockWidth=if($p.clock){90*$s}else{0}
    Write-MikuText '深圳 · °C' $cx $cy $p.city $primary ($cw-$clockWidth) ($header+5) $true
    if($p.clock){Write-MikuText $(if($Night){'11/14 18:24'}else{'11/14 10:31'}) ($cx+$cw-$clockWidth) $cy $p.meta $secondary $clockWidth ($header+5)}
    $bodyY=$cy+$header; $bodyH=$p.bodyHeight*$s
    $left=$p.leftWidth*$s
    $weather=[Math]::Max($p.icon,$p.normal*1.24)*$s
    $used=$p.temperature*1.18*$s+$weather+$(if($p.feels){$p.normal*1.24*$s}else{0})+$(if($p.range){$p.meta*1.24*$s}else{0})
    $ty=$bodyY+($bodyH-$used)/2
    Write-MikuText $Temperature $cx $ty $p.temperature $primary $left ($p.temperature*1.18*$s+5) $false 'Segoe UI Light'
    $ty+=$p.temperature*1.18*$s
    $iconName=if($Night){'clear_night'}else{'clear_day'}
    Draw-MikuImage (Join-Path $mikuRoot "android/app/src/main/res/drawable-nodpi/weather_${iconName}_pixel.png") ([Drawing.RectangleF]::new($cx,$ty,$p.icon*$s,$p.icon*$s)) $false
    Write-MikuText '晴' ($cx+($p.icon+4)*$s) $ty $p.normal $primary ($left-($p.icon+4)*$s) ($weather+4)
    $ty+=$weather
    if($p.feels){Write-MikuText '体感 28°C' $cx $ty $p.normal $secondary $left ($p.normal*1.24*$s+5);$ty+=$p.normal*1.24*$s}
    if($p.range){Write-MikuText '↑ 29°   ↓ 21°' $cx $ty $p.meta $secondary $left ($p.meta*1.24*$s+5)}
    $artX=$cx+$cw*.55
    Draw-MikuImage (Join-Path $mikuRoot "android/app/src/main/res/drawable/miku_${iconName}.png") ([Drawing.RectangleF]::new($artX,$bodyY,$cw*.45,$bodyH)) $Compact
    $bottom=$Y+($Height-$p.padding-26)*$s
    if($p.hint){Write-MikuText '今天也要元气满满呀' $cx ($bodyY+$bodyH) $p.meta $secondary $cw ($p.meta*1.24*$s+5)}
    Write-MikuText $(if($Width -lt 210){'和风天气'}else{'数据来自和风天气'}) $cx ($bottom+4*$s) $p.meta $secondary ($cw-28*$s) (26*$s)
    Write-MikuText '↻' ($cx+$cw-28*$s) ($bottom+1*$s) 20 $accent (28*$s) (26*$s)
    return [PSCustomObject]@{width=$Width;height=$Height;compact=$Compact;night=$Night;fontScale=$FontScale;plan=$p}
}
try {
    Write-MikuText '设计渲染预览 · 非实机截图' 30 18 19 '#F0FBF7' 1080 48 $true
    $plans=@()
    $plans+=Draw-MikuCard 30 110 340 180 $false $false 1 '26°' '4×2 · 340×180dp · 日间'
    $plans+=Draw-MikuCard 760 110 170 170 $true $false 1 '26°' '2×2 · 170×170dp · 日间'
    $plans+=Draw-MikuCard 30 580 340 180 $false $true 1 '24°' '4×2 · 340×180dp · 夜间'
    $plans+=Draw-MikuCard 760 580 170 170 $true $true 1 '24°' '2×2 · 170×170dp · 夜间'
    $plans+=Draw-MikuCard 30 1080 260 110 $false $false 2 '26°' '缩小宽版 · 260×110dp · 系统字体 200%'
    $plans+=Draw-MikuCard 640 1080 130 120 $true $false 1.8 '-112°' '紧凑极小尺寸 · 长负温度'
    Write-MikuText '字号来自原生尺寸预算；图片使用实际初音与 Pixel PNG。' 30 1370 11 '#DCF3ED' 1080 35
    Write-MikuText 'Android 字体测量、桌面留白与省电调度仍需实机核对。' 30 1403 10 '#BCD3CD' 1080 30
    $script:mikuCanvas.Save((Join-Path $OutputDirectory 'widgets-0.2.1.png'),[Drawing.Imaging.ImageFormat]::Png)
    $plans | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'layout-plans.json') -Encoding utf8
    Write-Output (Join-Path $OutputDirectory 'widgets-0.2.1.png')
} finally {
    $script:mikuGraphics.Dispose(); $script:mikuCanvas.Dispose()
}
