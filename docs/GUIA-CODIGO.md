# Guía rápida del código de ChaqPlay

Esta guía señala los archivos que normalmente tendrás que modificar. Los
comentarios dentro del código explican las decisiones que evitan cortes de
audio, ventanas duplicadas y consumo gráfico innecesario.

## Interfaz y reproducción

- `src/App.tsx`: estado principal, búsqueda, reproducción y cola.
- `src/SpectrumWindow.tsx`: ventana independiente, preferencias y geometría.
- `src/components/PlayerBar.tsx`: botones inferiores, volumen y progreso.
- `src/components/SpectrumMode.tsx`: dibujo del espectro compacto.
- `src/styles.css`: colores, tamaños, modo claro, modo oscuro y transparencia.
- `src/lib/queue.ts`: construye la cola automática al seleccionar una canción.
- `src/services/youtube.ts`: comunicación entre React y los comandos Rust.
- `src/i18n.ts`: todos los textos en español e inglés.

## Backend de Windows

- `src-tauri/src/lib.rs`: motor integrado, comandos de YouTube, bandeja,
  instancia única y ejecución sin consola.
- `src-tauri/tauri.conf.json`: nombre, versión, tamaño inicial, transparencia,
  iconos y seguridad.
- `src-tauri/capabilities/default.json`: permisos mínimos usados por la ventana.

## Cambios habituales

### Color y grosor del espectro

En `src/components/SpectrumMode.tsx`:

- `barWidth` controla el grosor máximo de cada línea.
- `context.fillStyle` controla el azul y su transparencia.
- `targetFrameTime` controla los FPS. Un número menor aumenta la fluidez y el
  consumo; 24 FPS es el equilibrio actual.

### Tamaño inicial del espectro

Modifica `width`, `height`, `minWidth` y `minHeight` de la ventana
`spectrum` en `src-tauri/tauri.conf.json`. Después del primer uso prevalecerá
la posición y tamaño guardados por `src/SpectrumWindow.tsx`.

### Tamaño del reproductor

Modifica `width`, `height`, `minWidth` y `minHeight` de la ventana `main` en
`src-tauri/tauri.conf.json`.

### Menú del icono junto al reloj

Los textos y acciones están en la función `run` de `src-tauri/src/lib.rs`.
Los eventos `player-state`, `spectrum-style`, `spectrum-pinned`,
`spectrum-visibility` y `app-language` comunican las dos ventanas y el menú
nativo. Los grupos de opciones se crean con `Submenu`.

### Streaming de YouTube

`resolve_youtube` en `src-tauri/src/lib.rs` usa `--get-url`: obtiene una URL
temporal del audio sin descargar el archivo completo. El elemento `<audio>` de
`src/App.tsx` crea un búfer y continúa cargando mientras reproduce.

### Idiomas y enlaces

Los textos visuales se modifican en `src/i18n.ts`. Los textos nativos de la
bandeja están en `select_language`, dentro de `src-tauri/src/lib.rs`. En ese
mismo archivo están centralizadas las direcciones de GitHub y apoyo.

### Actualizar el motor de YouTube

GitHub Actions ejecuta `npm run prepare:yt-dlp` antes de compilar. El archivo
descargado se integra dentro de `ChaqPlay.exe`; no se sube al repositorio ni se
entrega por separado.

## Verificación antes de publicar

```powershell
npm install
npm run prepare:yt-dlp
npm test
npm run tauri build
npm run package:portable
```

El resultado final estará en `ChaqPlay-Portable.zip`.
