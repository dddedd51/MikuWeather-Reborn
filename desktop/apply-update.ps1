param([Parameter(Mandatory=$true)][string]$Settings,
      [ValidateSet('Full','Prepare','Resume')][string]$Phase='Full')
$ErrorActionPreference='Stop'
$mikuBase=Split-Path -Parent ([IO.Path]::GetFullPath($Settings))
$mikuLog=Join-Path $mikuBase 'update.log'
$mikuExited=$Phase -eq 'Resume'
$mikuChanged=New-Object 'System.Collections.Generic.List[object]'
function Assert-MikuChild([string]$Path,[string]$Parent) {
    $mikuPrefix=$Parent.TrimEnd([IO.Path]::DirectorySeparatorChar)+[IO.Path]::DirectorySeparatorChar
    if(-not $Path.StartsWith($mikuPrefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe update path'}
}
function Copy-MikuFile([string]$Source,[string]$Destination) {
    for($mikuAttempt=0;$mikuAttempt -lt 50;$mikuAttempt++){
        try {Copy-Item -LiteralPath $Source -Destination $Destination -Force;return}
        catch {if($mikuAttempt -eq 49){throw};Start-Sleep -Milliseconds 200}
    }
}
function Get-MikuHash([string]$File) {
    $mikuHasher=[Security.Cryptography.SHA256]::Create()
    $mikuStream=[IO.File]::Open($File,'Open','Read',([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete))
    try {return [BitConverter]::ToString($mikuHasher.ComputeHash($mikuStream)).Replace('-','')}
    finally {$mikuStream.Dispose();$mikuHasher.Dispose()}
}
function Write-MikuResult([string]$Status,[string]$Message) {
    $mikuRecord=@{status=$Status;version=$mikuConfig.version;message=$Message;log=$mikuLog;at=[DateTime]::UtcNow.ToString('o')}
    if($mikuConfig.result){$mikuRecord | ConvertTo-Json -Compress | Set-Content -LiteralPath $mikuConfig.result -Encoding UTF8}
    $Message | Add-Content -LiteralPath $mikuLog -Encoding UTF8
}
try {
    # Settings are UTF-8 JSON even on Windows PowerShell 5.1.
    $mikuConfig=Get-Content -LiteralPath $Settings -Raw -Encoding UTF8 | ConvertFrom-Json
    if($mikuConfig.log){$mikuLog=$mikuConfig.log}
    ("Windows update helper " + $Phase) | Add-Content -LiteralPath $mikuLog -Encoding UTF8
    $mikuTarget=[IO.Path]::GetFullPath($mikuConfig.target).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $mikuStage=[IO.Path]::GetFullPath($mikuConfig.stage).TrimEnd([IO.Path]::DirectorySeparatorChar)
    Assert-MikuChild $mikuStage $mikuBase
    if($mikuTarget -eq [IO.Path]::GetPathRoot($mikuTarget).TrimEnd([IO.Path]::DirectorySeparatorChar) -or $mikuTarget -eq $mikuStage){throw 'Invalid update folders'}
    if([IO.Path]::GetFileName($mikuConfig.executable) -ne $mikuConfig.executable){throw 'Invalid executable'}
    $mikuExe=Join-Path $mikuTarget $mikuConfig.executable
    if(-not (Test-Path -LiteralPath $mikuExe -PathType Leaf) -or -not (Test-Path -LiteralPath (Join-Path $mikuStage $mikuConfig.executable) -PathType Leaf) -or -not (Test-Path -LiteralPath (Join-Path $mikuStage 'resources/app.asar') -PathType Leaf)){throw 'Incomplete update'}
    $targetKey=[Text.Encoding]::UTF8.GetBytes($mikuTarget.ToUpperInvariant())
    $keyHash=[Security.Cryptography.SHA256]::Create()
    try {$mutexName='Local\MikuWeatherUpdate-'+[BitConverter]::ToString($keyHash.ComputeHash($targetKey)).Replace('-','')}
    finally {$keyHash.Dispose()}
    $mutex=[Threading.Mutex]::new($false,$mutexName)
    try {$owned=$mutex.WaitOne(0)} catch [Threading.AbandonedMutexException] {$owned=$true}
    if(-not $owned){throw 'Another update is in progress'}
    $mikuBackup=Join-Path $mikuBase 'backup'
    Assert-MikuChild $mikuBackup $mikuBase
    $mikuPlan=@()
    foreach($mikuFile in Get-ChildItem -LiteralPath $mikuStage -Recurse -Force){
        if($mikuFile.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked update paths are not supported'}
        if($mikuFile.PSIsContainer){continue}
        $mikuRelative=$mikuFile.FullName.Substring($mikuStage.Length).TrimStart([IO.Path]::DirectorySeparatorChar)
        $mikuDestination=[IO.Path]::GetFullPath((Join-Path $mikuTarget $mikuRelative))
        Assert-MikuChild $mikuDestination $mikuTarget
        $mikuParent=Split-Path -Parent $mikuDestination
        while($mikuParent.Length -ge $mikuTarget.Length){
            if((Test-Path -LiteralPath $mikuParent) -and ((Get-Item -LiteralPath $mikuParent -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Linked installation paths are not supported'}
            $mikuParent=Split-Path -Parent $mikuParent
        }
        $mikuOld=Test-Path -LiteralPath $mikuDestination
        $mikuHash=Get-MikuHash $mikuFile.FullName
        if($mikuOld -and ((Get-Item -LiteralPath $mikuDestination -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Linked installation paths are not supported'}
        if($mikuOld -and (Get-Item -LiteralPath $mikuDestination).Length -eq $mikuFile.Length -and (Get-MikuHash $mikuDestination) -eq $mikuHash){continue}
        if($mikuOld -and ((Get-Item -LiteralPath $mikuDestination -Force).Attributes -band ([IO.FileAttributes]::ReadOnly -bor [IO.FileAttributes]::ReparsePoint))){throw 'Update destination is read-only or linked'}
        $mikuCopy=Join-Path $mikuBackup $mikuRelative
        if($mikuOld){
            New-Item -ItemType Directory -Path (Split-Path -Parent $mikuCopy) -Force | Out-Null
            Copy-Item -LiteralPath $mikuDestination -Destination $mikuCopy -Force
        }
        $mikuPlan+=@{source=$mikuFile.FullName;destination=$mikuDestination;backup=$mikuCopy;existed=$mikuOld;hash=$mikuHash}
    }
    # The app only quits after validation and a recoverable backup are complete.
    @{status='ready'} | ConvertTo-Json -Compress | Set-Content -LiteralPath $mikuConfig.ready -Encoding UTF8
    if($Phase -eq 'Prepare'){
        $mutex.ReleaseMutex();$mutex.Dispose()
        exit 0
    }
    if($Phase -ne 'Resume' -and [int]$mikuConfig.pid -gt 0){
        Wait-Process -Id $mikuConfig.pid -Timeout 90 -ErrorAction SilentlyContinue
        if(Get-Process -Id $mikuConfig.pid -ErrorAction SilentlyContinue){throw 'App still running'}
    }
    $mikuExited=$true
    Start-Sleep -Milliseconds 500
    foreach($mikuItem in $mikuPlan){
        $mikuChanged.Add($mikuItem)
        New-Item -ItemType Directory -Path (Split-Path -Parent $mikuItem.destination) -Force | Out-Null
        Copy-MikuFile $mikuItem.source $mikuItem.destination
        if((Get-MikuHash $mikuItem.destination) -ne $mikuItem.hash){throw 'Installed file checksum mismatch'}
    }
    Write-MikuResult 'applied' 'Update applied'
} catch {
    $mikuFailure=$_.Exception.Message
    if($mikuExited){
        foreach($mikuItem in $mikuChanged){
            try {
                Assert-MikuChild $mikuItem.destination $mikuTarget
                if($mikuItem.existed){Copy-MikuFile $mikuItem.backup $mikuItem.destination}
                elseif(Test-Path -LiteralPath $mikuItem.destination -PathType Leaf){[IO.File]::Delete($mikuItem.destination)}
            } catch {$mikuFailure+='; rollback '+$mikuItem.destination+': '+$_.Exception.Message}
        }
    }
    Write-MikuResult 'failed' $mikuFailure
    if(-not $mikuExited){exit 1}
}
try {
    if(-not $mikuConfig.noRestart){
        $launch=@{FilePath=$mikuExe;WorkingDirectory=$mikuTarget;WindowStyle='Hidden'}
        if($mikuConfig.profileOverride){$launch.ArgumentList='--user-data-dir="'+$mikuConfig.profileOverride+'"'}
        Start-Process @launch
    }
}
catch {Write-MikuResult 'failed' ('Restart failed: '+$_.Exception.Message);exit 1}
finally {if($owned){$mutex.ReleaseMutex()};if($mutex){$mutex.Dispose()}}
# Keep logs and failed recovery data. Successful, uniquely named temp stages can release their disk space.
if(-not $mikuFailure -and (Split-Path -Parent $mikuBase) -eq [IO.Path]::GetTempPath().TrimEnd('\') -and (Split-Path -Leaf $mikuBase) -like 'miku-update-*'){
    foreach($item in @('stage','backup','update.zip')){
        $cleanup=[IO.Path]::GetFullPath((Join-Path $mikuBase $item));Assert-MikuChild $cleanup $mikuBase
        try {
            if(Test-Path -LiteralPath $cleanup){Remove-Item -LiteralPath $cleanup -Recurse -Force -ErrorAction Stop}
        } catch {
            # A scanner or another process can still hold a temporary file after a successful install.
            try {('Temp cleanup deferred: '+$cleanup) | Add-Content -LiteralPath $mikuLog -Encoding UTF8 -ErrorAction Stop} catch {}
        }
    }
}
exit 0
