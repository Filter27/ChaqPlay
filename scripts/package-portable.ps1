$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ReleaseDirectory = Join-Path $ProjectRoot "src-tauri\target\release"
$PortableDirectory = Join-Path $ProjectRoot "ChaqPlay-Portable"
$PortableZip = Join-Path $ProjectRoot "ChaqPlay-Portable.zip"
$Application = Join-Path $ReleaseDirectory "chaqplay.exe"
$Instructions = Join-Path $ProjectRoot "PORTABLE-LEEME.txt"

if (-not (Test-Path $Application)) {
    throw "No se encontró chaqplay.exe. Ejecuta primero npm run tauri build."
}

if (Test-Path $PortableDirectory) {
    Remove-Item -Recurse -Force $PortableDirectory
}

if (Test-Path $PortableZip) {
    Remove-Item -Force $PortableZip
}

New-Item -ItemType Directory -Path $PortableDirectory | Out-Null
Copy-Item $Application (Join-Path $PortableDirectory "ChaqPlay.exe")
Copy-Item $Instructions (Join-Path $PortableDirectory "LEEME.txt")

Compress-Archive -Path (Join-Path $PortableDirectory "*") -DestinationPath $PortableZip -CompressionLevel Optimal

Write-Host "Versión portable creada: $PortableZip"
