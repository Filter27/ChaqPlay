# ChaqPlay

Reproductor de música minimalista para Windows. Busca canciones en YouTube mediante `yt-dlp` y transmite únicamente el audio dentro de una interfaz liviana construida con Tauri 2 y React.

## Uso de la versión portable

El usuario final no instala herramientas ni ejecuta comandos:

1. Descomprime `ChaqPlay-Portable.zip`.
2. Abre `ChaqPlay.exe`.

El motor de YouTube está integrado dentro de `ChaqPlay.exe` y se prepara
automáticamente en la carpeta privada de la aplicación. El usuario no ve ni
administra `yt-dlp.exe`. Node.js, Rust y Visual Studio solo son necesarios para
compilar el proyecto.

## Incluido en ChaqPlay v1.0

- Búsqueda de canciones, artistas y álbumes sin API key.
- Reproducción de audio sin mostrar video.
- Cola de reproducción.
- Favoritos e historial guardados localmente.
- Controles multimedia de Windows mediante Media Session.
- Instaladores NSIS y MSI.
- Empaquetado ZIP portable sin instalación.
- Espectro visual sincronizado con la reproducción y fondo transparente.
- Espectro conectado a 32 bandas reales del audio, activo solo cuando está visible.
- Ventana de espectro independiente, sin icono en la barra de tareas.
- Espectro arrastrable y redimensionable desde bordes y esquinas, sin controles emergentes.
- Minimización y cierre a la bandeja de Windows sin detener la reproducción.
- Transmisión progresiva: comienza con un búfer pequeño y continúa descargando mientras se reproduce, sin esperar el archivo completo.
- Recuperación automática AAC/M4A → WebM → HLS cuando YouTube entrega un formato incompatible.
- Temas claro y oscuro, guardados localmente.
- Ventana inicial compacta de 1000 × 680 px.
- Ejecución invisible de `yt-dlp`, sin abrir una consola.
- Barra de desplazamiento visualmente oculta.
- Ejecutable gráfico de Windows sin ventana de consola.
- Audio persistente al alternar entre reproductor y espectro.
- El modo espectro no intercepta ni redirige el audio, por lo que la música continúa sonando.
- Visualizador sin panel de fondo, con líneas azul oscuro, limitado a 24 FPS.
- Efectos gráficos costosos desactivados en el modo compacto.
- Reproducción automática de los resultados siguientes.
- Reproductor y espectro visibles u ocultos de manera independiente.
- Menú de bandeja simplificado, con las configuraciones del espectro agrupadas en un submenú.
- Diseños seleccionables: Líneas, Onda y Pulso.
- Interfaz y menú de bandeja disponibles en español e inglés.
- Submenú de ChaqPlay con acceso al repositorio y al enlace de apoyo.
- Botón del espectro sincronizado con la bandeja: verde cuando está visible y desactivable desde ambos lugares.
- Punto verde del progreso visible permanentemente.
- Menú sin la opción redundante “Mostrar ChaqPlay”; clic izquierdo en el icono restaura el reproductor.
- Posición, tamaño, estilo y fijado recordados entre ejecuciones.
- Recuperación automática del espectro fijado cuando Windows intenta minimizarlo.
- Restauración segura del reproductor aunque la ventana esté minimizada.
- Una sola instancia: abrir el ejecutable nuevamente recupera la aplicación existente.
- Motor de YouTube encapsulado dentro de `ChaqPlay.exe`.
- Base de proveedores preparada para integrar Spotify en una versión posterior.

## Requisitos para desarrollar en Windows

1. Node.js 24 o superior.
2. Rust estable con el target `x86_64-pc-windows-msvc`.
3. Microsoft C++ Build Tools y WebView2, según los requisitos oficiales de Tauri.
4. PowerShell con acceso a internet para descargar `yt-dlp`.

## Ejecutar en desarrollo

```powershell
npm install
npm run prepare:yt-dlp
npm run tauri dev
```

La vista web también se puede revisar con `npm run dev`, pero la búsqueda real y la reproducción solo funcionan dentro de Tauri.

## Crear el instalador

```powershell
npm install
npm run prepare:yt-dlp
npm test
npm run tauri build
npm run package:portable
```

El archivo portable quedará en `ChaqPlay-Portable.zip`. Los instaladores opcionales quedarán en `src-tauri\target\release\bundle`.

## Usar el espectro

Reproduce una canción y pulsa el icono de barras situado junto al volumen.
Arrastra cualquier zona libre para mover el espectro y usa sus bordes o
esquinas para cambiar el tamaño. No aparecen botones sobre el visualizador.
Para mostrarlo u ocultarlo usa el botón de barras o la casilla del icono junto
al reloj. El botón queda verde mientras el espectro está visible. Para fijarlo
o elegir entre **Líneas**, **Onda** y **Pulso**, abre el submenú
**Opciones del espectro**.

También se incluye `.github/workflows/build-windows.yml`. Al subir el proyecto a GitHub puedes ejecutarlo manualmente desde **Actions** o crear una etiqueta como `v1.0.0`. El flujo compila en Windows y deja el portable, los archivos `.exe` y `.msi` como un artefacto descargable.

## Consumo de memoria

ChaqPlay utiliza WebView2, el componente de Windows basado en Chromium que
Tauri emplea para dibujar la interfaz. El Administrador de tareas muestra sus
procesos de renderizado, audio, red, GPU y almacenamiento agrupados aunque
pertenezcan a una sola aplicación. No son ocho copias de ChaqPlay. El
analizador utiliza solo 32 bandas, se limita a 24 FPS y se detiene cuando el
espectro está oculto o la música está pausada. Los datos no producen
renderizados adicionales de React.

## Arquitectura

- `src/`: interfaz, estado del reproductor y almacenamiento local.
- `src/services/youtube.ts`: adaptador entre React y el backend.
- `src-tauri/src/lib.rs`: validación, búsqueda y resolución segura con `yt-dlp`.
- `scripts/prepare-yt-dlp.ps1`: descarga el motor únicamente durante la compilación para integrarlo en el ejecutable.

Para ubicar rápidamente cada ajuste consulta
[`docs/GUIA-COMPLETA.md`](docs/GUIA-COMPLETA.md). La guía describe cada
archivo, la reproducción, el espectro y todos los pasos de compilación.

El frontend nunca puede ejecutar comandos arbitrarios. Las búsquedas, la
resolución del audio y el estado del menú pasan por comandos Tauri explícitos.
Los argumentos del motor se construyen en Rust después de validar la entrada.

## Nota de uso

Esta versión está pensada para uso privado y experimental. La extracción de audio no es una integración oficial de YouTube y puede dejar de funcionar cuando YouTube cambie su plataforma. Mantén `yt-dlp` actualizado y revisa las condiciones de los servicios antes de distribuir la aplicación.

El proyecto no contiene código de Nuclear y se publica con licencia MIT. `yt-dlp` se descarga por separado y conserva su propia licencia.
