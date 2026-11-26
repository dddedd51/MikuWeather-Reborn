function Read-MikuPackage([string]$Path) {
    $stream = [IO.File]::Open($Path, 'Open', 'Read', [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete)
    $reader = New-Object IO.BinaryReader($stream)
    try {
        if ($reader.ReadUInt32() -ne 4) {throw 'Invalid ASAR header'}
        $headerSize = $reader.ReadUInt32()
        $null = $reader.ReadUInt32()
        $jsonSize = $reader.ReadUInt32()
        if ($jsonSize -le 0 -or $jsonSize -gt 8MB -or $jsonSize + 8 -gt $headerSize -or $headerSize + 8 -gt $stream.Length) {throw 'Invalid ASAR index'}
        $index = [Text.Encoding]::UTF8.GetString($reader.ReadBytes($jsonSize)) | ConvertFrom-Json
        $entry = $index.files.'package.json'
        if (!$entry -or $entry.unpacked -or $entry.link -or $entry.size -le 0 -or $entry.size -gt 1MB) {throw 'Missing package metadata'}
        $offset = [int64]$entry.offset
        if ($offset -lt 0 -or 8 + $headerSize + $offset + $entry.size -gt $stream.Length) {throw 'Invalid package offset'}
        $stream.Position = 8 + $headerSize + $offset
        return ([Text.Encoding]::UTF8.GetString($reader.ReadBytes($entry.size)) | ConvertFrom-Json)
    } finally {$reader.Dispose(); $stream.Dispose()}
}
