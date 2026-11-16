param([string]$Settings)
$ErrorActionPreference='Stop'
$mikuConfig=Get-Content -LiteralPath $Settings -Raw | ConvertFrom-Json
$mikuTarget=[IO.Path]::GetFullPath($mikuConfig.target)
$mikuStage=[IO.Path]::GetFullPath($mikuConfig.stage)
$mikuExe=Join-Path $mikuTarget $mikuConfig.executable
$mikuBackup=Join-Path (Split-Path -Parent $Settings) 'backup'
try {
    if(-not (Test-Path -LiteralPath $mikuExe) -or -not (Test-Path -LiteralPath (Join-Path $mikuStage 'resources/app.asar'))){throw 'Invalid update folders'}
    Wait-Process -Id $mikuConfig.pid -Timeout 60 -ErrorAction SilentlyContinue
    if(Get-Process -Id $mikuConfig.pid -ErrorAction SilentlyContinue){throw 'App still running'}
    Start-Sleep -Seconds 2
    New-Item -ItemType Directory -Path $mikuBackup -Force | Out-Null
    # Back up only files which this update will replace; settings stay in AppData.
    foreach($mikuFile in Get-ChildItem -LiteralPath $mikuStage -File -Recurse){
        $mikuRelative=$mikuFile.FullName.Substring($mikuStage.Length).TrimStart('\')
        $mikuDestination=[IO.Path]::GetFullPath((Join-Path $mikuTarget $mikuRelative))
        if(-not $mikuDestination.StartsWith($mikuTarget+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe target'}
        if(Test-Path -LiteralPath $mikuDestination){$mikuCopy=Join-Path $mikuBackup $mikuRelative;New-Item -ItemType Directory -Path (Split-Path -Parent $mikuCopy) -Force | Out-Null;Copy-Item -LiteralPath $mikuDestination -Destination $mikuCopy -Force}
    }
    foreach($mikuItem in Get-ChildItem -LiteralPath $mikuStage){Copy-Item -LiteralPath $mikuItem.FullName -Destination $mikuTarget -Recurse -Force}
    'Update applied' | Set-Content -LiteralPath $mikuConfig.log
} catch {
    $_.Exception.Message | Set-Content -LiteralPath $mikuConfig.log
    if(Test-Path -LiteralPath $mikuBackup){foreach($mikuItem in Get-ChildItem -LiteralPath $mikuBackup){Copy-Item -LiteralPath $mikuItem.FullName -Destination $mikuTarget -Recurse -Force -ErrorAction SilentlyContinue}}
}
Start-Process -FilePath $mikuExe -WorkingDirectory $mikuTarget -WindowStyle Hidden
