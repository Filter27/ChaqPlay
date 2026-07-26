# ChaqPlay: guía completa del proyecto

Esta guía explica ChaqPlay v1.0 desde cero. Está pensada para poder hacer
cambios futuros aunque no se conozca todavía React, Rust o Tauri.

## 1. Qué tecnologías usa

- **React + TypeScript:** dibujan la interfaz y mantienen el estado del
  reproductor.
- **Tauri 2 + Rust:** crean la aplicación de Windows, las ventanas, el icono de
  bandeja y la comunicación segura con `yt-dlp`.
- **yt-dlp:** busca videos y obtiene direcciones temporales del audio.
- **hls.js:** respaldo para canciones que YouTube entrega como HLS. Se carga
  dinámicamente, solo si los formatos directos fallan.
- **WebView2:** componente incluido normalmente en Windows que muestra React y
  reproduce el audio.

## 2. Estructura general

```text
ChaqPlay/
├─ .github/workflows/
├─ docs/
├─ scripts/
├─ src/
│  ├─ components/
│  ├─ lib/
│  └─ services/
└─ src-tauri/
   ├─ binaries/
   ├─ capabilities/
   ├─ icons/
   └─ src/
```

`src` es la parte visual. `src-tauri` es la parte nativa de Windows.

## 3. Archivos de la raíz

### `package.json`

Declara el nombre, la versión, las bibliotecas JavaScript y los comandos:

- `npm run dev`: abre solamente la vista web de desarrollo.
- `npm test`: ejecuta las pruebas.
- `npm run build`: valida TypeScript y genera `dist`.
- `npm run prepare:yt-dlp`: descarga el motor para integrarlo.
- `npm run tauri dev`: abre la aplicación completa en desarrollo.
- `npm run tauri build`: crea el ejecutable y los instaladores.
- `npm run package:portable`: crea el ZIP portable.

### `package-lock.json`

Fija las versiones exactas instaladas por npm. No se edita manualmente.

### `index.html`

Página mínima donde React monta la aplicación.

### `vite.config.ts`

Configuración del compilador web Vite y del complemento de React.

### `tsconfig.json` y `tsconfig.node.json`

Reglas de TypeScript para la interfaz y para los archivos de configuración.

### `.gitignore`

Evita subir dependencias, compilaciones y el binario descargado de `yt-dlp`.

### `LICENSE`

Licencia MIT del código de ChaqPlay.

### `README.md`

Presentación pública del repositorio, características e instrucciones.

### `PORTABLE-LEEME.txt`

Instrucciones breves incluidas dentro del paquete que recibe el usuario.

## 4. Interfaz: carpeta `src`

### `src/main.tsx`

Punto de entrada. Revisa la dirección de la ventana:

- Ventana normal: carga `App.tsx`.
- Dirección `?spectrum`: carga únicamente `SpectrumWindow.tsx`.

La importación es dinámica para que el espectro no cargue toda la interfaz.

### `src/App.tsx`

Es el controlador principal:

- mantiene canción, cola, progreso, volumen, tema e idioma;
- ejecuta búsquedas;
- solicita formatos de audio con reintentos;
- crea y conserva el elemento `<audio>`;
- carga `hls.js` únicamente como respaldo;
- avanza automáticamente a la siguiente canción;
- analiza 32 bandas reales del audio y las envía al espectro;
- sincroniza el espectro y el menú de bandeja;
- oculta la ventana al minimizar o cerrar.

Cadena de reproducción:

1. El usuario selecciona una canción.
2. Se prueba audio AAC/M4A directo.
3. Si falla, se prueba WebM directo.
4. Si también falla, se solicita HLS.
5. Para HLS se importa `hls.js` y se conecta al mismo `<audio>`.
6. Solo después de fallar los tres intentos aparece un mensaje amigable.

### `src/SpectrumWindow.tsx`

Controla exclusivamente la segunda ventana:

- recibe estado de reproducción;
- recuerda estilo, posición y tamaño;
- restaura la geometría al abrir;
- intenta permanecer visible cuando está fijada;
- actualiza el menú si se oculta.

### `src/i18n.ts`

Contiene todas las frases visibles en español e inglés. Para cambiar una
traducción se modifica el valor correspondiente sin tocar los componentes.

### `src/i18n.test.ts`

Comprueba que ambos idiomas devuelvan sus textos correctos.
Solo se ejecuta con `npm test`: no forma parte de `ChaqPlay.exe` y no consume
memoria ni espacio en el programa final.

### `src/types.ts`

Define las estructuras compartidas: canción, fuente de audio, estado y vista.

### `src/styles.css`

Contiene todo el diseño:

- temas claro y oscuro;
- navegación, listas y reproductor;
- punto verde permanente del progreso;
- botón verde del espectro;
- ventana de espectro totalmente transparente;
- tamaños adaptables.

### `src/vite-env.d.ts`

Tipos que Vite agrega al proyecto. Normalmente no se modifica.

## 5. Componentes visuales

### `src/components/Logo.tsx`

Logotipo reutilizable de ChaqPlay.

### `src/components/Sidebar.tsx`

Menú lateral, cambio de sección, tema y fuente activa. Recibe el idioma desde
`App.tsx`.

### `src/components/SearchBox.tsx`

Cuadro superior de búsqueda, botón, borrado y foco automático.

### `src/components/TrackList.tsx`

Lista de resultados, favoritos e historial. Envía a `App.tsx` las acciones de
reproducir, guardar o agregar a la cola.

### `src/components/TrackArtwork.tsx`

Muestra la portada o un marcador cuando no hay imagen.

### `src/components/PlayerBar.tsx`

Barra inferior con canción, controles, progreso, cola, espectro y volumen. El
botón del espectro usa `aria-pressed` y la clase `active`; ambos dependen del
mismo estado que la casilla de bandeja.

### `src/components/SpectrumMode.tsx`

Dibuja en Canvas los estilos Líneas, Onda y Pulso a un máximo de 24 FPS.
Incluye únicamente zonas invisibles para mover y redimensionar.

## 6. Funciones auxiliares

### `src/lib/storage.ts`

Lee y escribe favoritos, historial, tema, idioma y volumen en `localStorage`.

### `src/lib/queue.ts`

Construye la cola usando las canciones posteriores a la seleccionada.

### `src/lib/queue.test.ts`

Pruebas del orden y funcionamiento de la cola.

### `src/lib/format.ts`

Convierte segundos a texto `minutos:segundos`.

### `src/lib/format.test.ts`

Pruebas del formato de duración.

### `src/services/youtube.ts`

Puente entre React y Rust. La interfaz no ejecuta procesos directamente:
solamente invoca `search_youtube` y `resolve_youtube`.

## 7. Parte nativa: carpeta `src-tauri`

### `src-tauri/src/main.rs`

Entrada mínima del ejecutable. Llama a la biblioteca principal.

### `src-tauri/src/lib.rs`

Es el núcleo nativo:

- integra y extrae `yt-dlp` en una carpeta privada;
- lo ejecuta sin ventana de comandos;
- valida búsquedas e identificadores;
- obtiene resultados de YouTube;
- resuelve M4A, WebM y HLS;
- crea el menú de bandeja y sus submenús;
- traduce el menú;
- abre GitHub y el enlace de apoyo;
- controla las dos ventanas;
- impide abrir dos instancias.

### `src-tauri/Cargo.toml`

Equivalente Rust de `package.json`: versión y dependencias nativas.

### `src-tauri/build.rs`

Ejecuta la preparación estándar de Tauri durante la compilación.

### `src-tauri/tauri.conf.json`

Configura:

- nombre y versión;
- tamaño de las ventanas;
- transparencia y ausencia de icono del espectro;
- instaladores;
- iconos;
- política de seguridad para miniaturas y audio de Google.

### `src-tauri/capabilities/default.json`

Lista mínima de operaciones permitidas a React, como mostrar, ocultar, mover o
redimensionar ventanas. Todo lo que no aparece queda bloqueado.

### `src-tauri/binaries/README.md`

Explica dónde se coloca `yt-dlp` al compilar. El `.exe` real no se sube.

### `src-tauri/icons`

La entrega v1.0 conserva únicamente los cuatro archivos declarados en
`tauri.conf.json`: `32x32.png`, `128x128.png`, `128x128@2x.png` e `icon.ico`.
Tauri había generado además iconos para Android, iOS, macOS y Microsoft Store,
pero ChaqPlay apunta solo a Windows y el ZIP fuente los excluye. Esos archivos
nunca se cargaban en memoria ni se incorporaban al ejecutable actual.

## 8. Scripts y automatización

### `scripts/prepare-yt-dlp.ps1`

Descarga la versión reciente de `yt-dlp.exe`, valida que parezca ejecutable y
la deja con el nombre que espera Rust.

### `scripts/package-portable.ps1`

Copia `ChaqPlay.exe` y `PORTABLE-LEEME.txt` y genera
`ChaqPlay-Portable.zip`.

### `.github/workflows/build-windows.yml`

GitHub Actions:

1. descarga el repositorio;
2. instala Node;
3. instala Rust;
4. ejecuta `npm ci`;
5. prepara `yt-dlp`;
6. ejecuta las pruebas;
7. compila Tauri;
8. crea el portable;
9. publica ZIP, NSIS y MSI como artefactos.

## 9. Cómo probar y compilar

### En GitHub, sin instalar herramientas

1. Sube todos los archivos respetando sus carpetas.
2. Abre **Actions**.
3. Selecciona **Compilar ChaqPlay para Windows**.
4. Pulsa **Run workflow**.
5. Espera el check verde.
6. Abre la ejecución terminada.
7. Descarga el artefacto del final.
8. Descomprime primero el artefacto de GitHub.
9. Dentro encontrarás `ChaqPlay-Portable.zip`.

### En Windows para desarrollar

Instala Node.js, Rust, Microsoft C++ Build Tools y WebView2. Después:

```powershell
npm install
npm run prepare:yt-dlp
npm test
npm run tauri dev
```

Para crear la versión final:

```powershell
npm run tauri build
npm run package:portable
```

## 10. Dónde hacer cambios habituales

| Cambio | Archivo |
|---|---|
| Textos español/inglés | `src/i18n.ts` |
| Colores o punto de progreso | `src/styles.css` |
| Botones inferiores | `src/components/PlayerBar.tsx` |
| Comportamiento de reproducción | `src/App.tsx` |
| Formatos/reintentos de YouTube | `src-tauri/src/lib.rs` |
| Opciones de bandeja | `src-tauri/src/lib.rs` |
| Estilos del espectro | `src/components/SpectrumMode.tsx` |
| Tamaños iniciales | `src-tauri/tauri.conf.json` |
| Enlaces de GitHub/donación | `src-tauri/src/lib.rs` |
| Contenido del portable | `scripts/package-portable.ps1` |

## 11. Nota sobre YouTube

La integración no es oficial y YouTube cambia sus mecanismos periódicamente.
Por eso ChaqPlay mantiene varios formatos y `yt-dlp` se descarga nuevamente en
cada compilación. Si todos fallan, lo primero que debe hacerse es recompilar
para integrar la versión más reciente del motor.

## 12. Cómo sigue el espectro el ritmo real

1. `App.tsx` crea un `AudioContext` una sola vez.
2. `AnalyserNode` divide el sonido en 32 bandas de frecuencia.
3. Solo cuando el espectro está visible y reproduciendo se leen las bandas.
4. Se envían como `spectrum-frame` a un máximo de 24 veces por segundo.
5. `SpectrumWindow.tsx` las guarda en una referencia, sin renderizar React.
6. `SpectrumMode.tsx` usa graves, medios y agudos para dibujar cada estilo.
7. Al ocultar el espectro, el ciclo se detiene y envía valores cero.
