# Hoja de ruta de ChaqPlay

## Versión portable

La distribución principal será `ChaqPlay-Portable.zip`. Contendrá solamente:

- `ChaqPlay.exe`
- `LEEME.txt`

El usuario no necesitará Node.js, Rust, Visual Studio ni un instalador. En Windows 10 y 11, ChaqPlay utilizará WebView2, que normalmente ya forma parte del sistema.

## Minimizar al área de notificaciones — implementado en v0.3

- Al minimizar o cerrar la ventana, ChaqPlay continuará reproduciendo.
- El espectro usa una ventana separada sin botón en la barra de tareas.
- El icono quedará junto al reloj de Windows.
- Clic izquierdo: mostrar.
- Menú contextual: visibilidad independiente, submenú del espectro, idioma,
  enlaces del proyecto y salir.

## Modo solo espectro — implementado en v0.3

Ventana compacta inspirada en la referencia entregada por el usuario:

- Tamaño inicial 560 × 92 px y mínimo 220 × 36 px.
- Sin bordes ni barra de título.
- Fondo completamente transparente: el color visible pertenece al escritorio.
- Líneas verticales finas en azul oscuro.
- Sin panel, borde, sombra ni color de fondo.
- Arrastrable y redimensionable desde ocho direcciones.
- Opción “siempre visible”.
- Posición y tamaño persistentes.
- Sin botones ni paneles al pasar el cursor.
- Tres estilos: Líneas, Onda y Pulso.

El visualizador recibe 32 bandas reales del audio. La captura funciona solo
mientras la ventana está visible y la canción está sonando.

## ChaqPlay v1.0

- Audio progresivo: no espera la descarga completa de canciones o mezclas largas.
- Respaldo automático entre M4A, WebM y HLS.
- Interfaz y menú nativo en español e inglés.
- Estado del espectro sincronizado entre la casilla de bandeja y el botón verde.
- Acceso directo al repositorio y a la página de apoyo.
- Espectro alimentado por 32 bandas reales de la canción.
- Analizador detenido automáticamente al ocultar o pausar el espectro.
