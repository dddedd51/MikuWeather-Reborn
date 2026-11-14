param([Parameter(Mandatory)][string]$Manifest,[Parameter(Mandatory)][string]$Output)
$ErrorActionPreference='Stop'
$mikuSourceRoot=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$mikuSourceFiles=Get-Content -LiteralPath (Join-Path $mikuSourceRoot $Manifest) -Raw -Encoding utf8 | ConvertFrom-Json
$mikuOutputPath=Join-Path $mikuSourceRoot $Output
$mikuOutputStream=[System.IO.File]::Open($mikuOutputPath,[System.IO.FileMode]::Create,[System.IO.FileAccess]::ReadWrite)
$mikuArchive=[System.IO.Compression.ZipArchive]::new($mikuOutputStream,[System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($mikuRelative in $mikuSourceFiles) {
        $mikuAbsolute=[System.IO.Path]::GetFullPath((Join-Path $mikuSourceRoot $mikuRelative))
        if (-not $mikuAbsolute.StartsWith($mikuSourceRoot+[System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)) { throw '源码路径超出项目目录' }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($mikuArchive,$mikuAbsolute,$mikuRelative,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $mikuArchive.Dispose(); $mikuOutputStream.Dispose() }
Write-Output $mikuOutputPath
