$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BinaryDirectory = Join-Path $ProjectRoot "src-tauri\binaries"
$Target = Join-Path $BinaryDirectory "yt-dlp-x86_64-pc-windows-msvc.exe"
$Download = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

# Este archivo se usa solo como entrada de compilación. Rust lo encapsula
# dentro de ChaqPlay.exe y el empaquetado portable no lo copia por separado.
New-Item -ItemType Directory -Force -Path $BinaryDirectory | Out-Null
Write-Host "Descargando yt-dlp estable..."
Invoke-WebRequest -Uri $Download -OutFile $Target -UseBasicParsing

if (-not (Test-Path $Target) -or (Get-Item $Target).Length -lt 1000000) {
    throw "La descarga de yt-dlp no parece válida."
}

Write-Host "Motor preparado: $Target"
