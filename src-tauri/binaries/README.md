# Motor integrado

Antes de compilar en Windows, ejecuta `npm run prepare:yt-dlp` desde la raíz del proyecto.
El script descarga la versión estable más reciente. Rust la incorpora dentro
de `ChaqPlay.exe` mediante `include_bytes!`.

El archivo descargado no se guarda en Git ni se entrega junto al portable. En
el equipo del usuario se extrae automáticamente en los datos privados de la
aplicación cuando hace falta.
