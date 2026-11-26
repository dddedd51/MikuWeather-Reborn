param([string]$Archive,[string]$Stage,[string]$ExpectedVersion)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$mikuStage=[IO.Path]::GetFullPath($Stage)
$mikuZip=[IO.Compression.ZipFile]::OpenRead($Archive)
try {
    foreach($mikuEntry in $mikuZip.Entries){
        if([IO.Path]::IsPathRooted($mikuEntry.FullName) -or $mikuEntry.FullName.Contains(':')){throw 'Unsafe archive path'}
        $mikuEntryPath=[IO.Path]::GetFullPath((Join-Path $mikuStage $mikuEntry.FullName))
        if(-not $mikuEntryPath.StartsWith($mikuStage+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -and $mikuEntryPath -ne $mikuStage){throw 'Unsafe archive path'}
    }
} finally {$mikuZip.Dispose()}
if ([IO.Directory]::Exists($mikuStage)) {throw 'The staging directory already exists'}
[IO.Compression.ZipFile]::ExtractToDirectory($Archive,$mikuStage)
if(-not (Test-Path -LiteralPath (Join-Path $mikuStage 'Miku Weather Reborn.exe')) -or -not (Test-Path -LiteralPath (Join-Path $mikuStage 'resources/app.asar'))){throw 'Incomplete update'}
if ($ExpectedVersion) {
    . (Join-Path $PSScriptRoot 'read-package.ps1')
    $staged = Read-MikuPackage (Join-Path $mikuStage 'resources/app.asar')
    if ($staged.name -ne 'miku-weather-reborn' -or $staged.version -ne $ExpectedVersion) {throw 'Staged package mismatch'}
}
