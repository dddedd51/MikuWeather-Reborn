param([string]$TargetExe, [string]$Archive, [switch]$NoRestart)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
    . (Join-Path $PSScriptRoot 'read-package.ps1')
    $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'release.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if (!$TargetExe) {
        Add-Type -AssemblyName System.Windows.Forms
        $picker = New-Object Windows.Forms.OpenFileDialog
        $picker.Title = '请选择旧版初音天气的 Miku Weather Reborn.exe'
        $picker.Filter = '初音天气|Miku Weather Reborn.exe'
        if ($picker.ShowDialog() -ne 'OK') {return}
        $TargetExe = $picker.FileName
        $picker.Dispose()
    }
    $exe = (Get-Item -LiteralPath $TargetExe).FullName
    if ([IO.Path]::GetFileName($exe) -ne 'Miku Weather Reborn.exe') {throw '请选择旧版的 Miku Weather Reborn.exe。'}
    $target = [IO.Path]::GetDirectoryName($exe)
    $pkg = Read-MikuPackage (Join-Path $target 'resources/app.asar')
    if ($pkg.name -ne 'miku-weather-reborn') {throw '此目录没有可识别的初音天气。'}
    if ([version]$pkg.version -ge [version]$manifest.version) {
        Write-Host ("此目录已安装 " + $pkg.version)
        if ($picker) {[Windows.Forms.MessageBox]::Show("当前版本为 $($pkg.version)。", '初音天气') | Out-Null}
        return
    }
    function Get-RunningMiku {
        @(Get-Process -Name 'Miku Weather Reborn' -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe })
    }
    while (Get-RunningMiku) {
        if (!$picker) {throw '请从系统托盘退出此目录中的初音天气，再运行修复。'}
        $answer = [Windows.Forms.MessageBox]::Show('请右键系统托盘中的初音天气，选择「退出」，再点「重试」。', '初音天气', 'RetryCancel')
        if ($answer -ne 'Retry') {return}
    }
    $base = Join-Path ([IO.Path]::GetTempPath()) ('miku-update-' + [Guid]::NewGuid().ToString('N'))
    [IO.Directory]::CreateDirectory($base) | Out-Null
    $archiveName = "MikuWeather-Reborn-$($manifest.version)-Windows-x64.zip"
    if (!$Archive) {
        # An adjacent full ZIP also works entirely offline.
        $Archive = Join-Path $PSScriptRoot $archiveName
        if (!(Test-Path -LiteralPath $Archive -PathType Leaf)) {
            $Archive = Join-Path (Split-Path -Parent $PSScriptRoot) $archiveName
        }
        if (!(Test-Path -LiteralPath $Archive -PathType Leaf)) {
            $Archive = Join-Path $base 'update.zip'
            $url = "https://github.com/dddedd51/MikuWeather-Reborn/releases/download/v$($manifest.version)/$archiveName"
            Write-Host "正在下载 $archiveName，也可以将完整 ZIP 放在 Repair.cmd 旁边后重试。"
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $Archive -TimeoutSec 600
        }
    }
    if ((Get-Item -LiteralPath $Archive).Length -ne $manifest.size -or (Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash -ne $manifest.sha256) {
        throw 'Windows ZIP 校验失败，请重新下载对应版本。'
    }
    $stage = Join-Path $base 'stage'
    Write-Host "正在更新 $($pkg.version) → $($manifest.version)：$target"
    & (Join-Path $PSScriptRoot 'stage-update.ps1') $Archive $stage $manifest.version
    $settings = Join-Path $base 'update.json'
    $result = Join-Path $base 'result.json'
    $log = Join-Path $base 'update.log'
    $config = @{pid=0;target=$target;stage=$stage;executable=[IO.Path]::GetFileName($exe);version=$manifest.version;ready=(Join-Path $base 'ready.json');log=$log;result=$result;noRestart=[bool]$NoRestart}
    [IO.File]::WriteAllText($settings, ($config | ConvertTo-Json -Compress), [Text.UTF8Encoding]::new($false))
    # Run in a separate PowerShell process so its exit code and rollback result are both available.
    & "$PSHOME/powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'apply-update.ps1') $settings
    $helperExit = $LASTEXITCODE
    $applied = Get-Content -LiteralPath $result -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($helperExit -ne 0 -or $applied.status -ne 'applied') {throw ($applied.message + '  ' + $log)}
    $installed = Read-MikuPackage (Join-Path $target 'resources/app.asar')
    if ($installed.version -ne $manifest.version) {throw '更新后目录内的版本校验失败。'}
    Write-Host ("已更新至 " + $installed.version)
    if ($picker) {[Windows.Forms.MessageBox]::Show("已更新至 $($installed.version)。城市和偏好仍保存在原用户目录。", '初音天气') | Out-Null}
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
