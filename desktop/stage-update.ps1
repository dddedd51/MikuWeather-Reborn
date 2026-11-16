param([string]$Archive,[string]$Stage)
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
Expand-Archive -LiteralPath $Archive -DestinationPath $mikuStage
if(-not (Test-Path -LiteralPath (Join-Path $mikuStage 'Miku Weather Reborn.exe')) -or -not (Test-Path -LiteralPath (Join-Path $mikuStage 'resources/app.asar'))){throw 'Incomplete update'}
