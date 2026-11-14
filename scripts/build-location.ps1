$ErrorActionPreference='Stop'
$mikuRoot=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$mikuCompiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$mikuRuntime=Get-ChildItem -LiteralPath (Join-Path $env:WINDIR 'Microsoft.NET/assembly/GAC_MSIL/System.Runtime.WindowsRuntime') -Filter System.Runtime.WindowsRuntime.dll -Recurse | Select-Object -First 1 -ExpandProperty FullName
$mikuSystemRuntime=Get-ChildItem -LiteralPath (Join-Path $env:WINDIR 'Microsoft.NET/assembly/GAC_MSIL/System.Runtime') -Filter System.Runtime.dll -Recurse | Select-Object -First 1 -ExpandProperty FullName
$mikuFoundation=Join-Path $env:WINDIR 'System32/WinMetadata/Windows.Foundation.winmd'
$mikuDevices=Join-Path $env:WINDIR 'System32/WinMetadata/Windows.Devices.winmd'
if (-not (Test-Path -LiteralPath $mikuCompiler) -or -not $mikuRuntime) { throw 'Windows 需安装 .NET Framework 4.8 才能构建系统定位助手' }
$mikuSource=Join-Path $mikuRoot 'desktop/location-helper/MikuLocation.cs'
$mikuOutput=Join-Path $mikuRoot 'desktop/location-helper/MikuLocation.exe'
& $mikuCompiler /nologo /codepage:65001 /target:exe /optimize+ /platform:anycpu /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "/reference:$mikuRuntime" "/reference:$mikuSystemRuntime" "/reference:$mikuFoundation" "/reference:$mikuDevices" "/out:$mikuOutput" $mikuSource
if ($LASTEXITCODE -ne 0) { throw 'Windows 定位助手构建失败' }
Write-Output 'Windows 一次定位助手已构建'
