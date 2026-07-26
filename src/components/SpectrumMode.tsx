import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type SpectrumStyle = "bars" | "wave" | "pulse";

interface SpectrumModeProps {
  playing: boolean;
  playbackTime: number;
  style: SpectrumStyle;
}

/**
 * Superficie gráfica del espectro.
 *
 * No contiene botones, textos ni zonas emergentes. La ventana completa sirve
 * para arrastrar y los ocho bordes invisibles permiten redimensionar. Todos
 * los controles están en el menú del icono de Windows.
 */
export function SpectrumMode({ playing, playbackTime, style }: SpectrumModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playbackTimeRef = useRef(playbackTime);
  const playingRef = useRef(playing);
  const styleRef = useRef(style);

  useEffect(() => { playbackTimeRef.current = playbackTime; }, [playbackTime]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { styleRef.current = style; }, [style]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    let previousFrame = 0;
    const targetFrameTime = 1000 / 24;

    const draw = (timestamp: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || timestamp - previousFrame < targetFrameTime) return;
      previousFrame = timestamp;

      // Resolución 1:1 para mantener muy bajo el consumo en monitores HiDPI.
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      if (canvas.width !== Math.floor(width) || canvas.height !== Math.floor(height)) {
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
      }
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, width, height);

      const time = playbackTimeRef.current + timestamp / 1000;
      if (styleRef.current === "wave") drawWave(context, width, height, time, playingRef.current);
      else if (styleRef.current === "pulse") drawPulse(context, width, height, time, playingRef.current);
      else drawBars(context, width, height, time, playingRef.current);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  const startDrag = async (event: React.MouseEvent) => {
    if (event.button !== 0 || (event.target as HTMLElement).classList.contains("resize-handle")) return;
    await getCurrentWindow().startDragging();
  };

  return (
    <section className="spectrum-mode" onMouseDown={(event) => void startDrag(event)}>
      <canvas ref={canvasRef} aria-label="Visualizador musical de ChaqPlay" />
      <ResizeHandles />
    </section>
  );
}

function drawBars(context: CanvasRenderingContext2D, width: number, height: number, time: number, playing: boolean) {
  const count = Math.max(18, Math.min(64, Math.floor(width / 9)));
  const step = width / count;
  const barWidth = Math.min(2.2, Math.max(1.2, step * 0.2));
  const usableHeight = Math.max(8, height - 8);
  context.fillStyle = "rgba(35, 103, 178, .88)";

  for (let index = 0; index < count; index += 1) {
    const position = index / Math.max(1, count - 1);
    const bassShape = 1 - position * 0.5;
    const wave =
      Math.sin(time * 3.1 + index * 0.72) * 0.28 +
      Math.sin(time * 5.7 - index * 0.31) * 0.17 +
      Math.sin(time * 1.4 + index * 1.83) * 0.09;
    const level = Math.max(0.04, (0.42 + wave) * bassShape);
    const barHeight = playing ? Math.max(2, level * usableHeight) : 2;
    const x = index * step + (step - barWidth) / 2;
    context.beginPath();
    context.roundRect(x, height - barHeight - 3, barWidth, barHeight, barWidth / 2);
    context.fill();
  }
}

// Tres ondas finas superpuestas crean profundidad sin filtros ni sombras GPU.
function drawWave(context: CanvasRenderingContext2D, width: number, height: number, time: number, playing: boolean) {
  const center = height / 2;
  const amplitude = playing ? height * 0.28 : 1;
  const colors = ["rgba(32, 103, 196, .82)", "rgba(67, 131, 215, .48)", "rgba(96, 76, 205, .36)"];

  colors.forEach((color, layer) => {
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = layer === 0 ? 1.5 : 1;
    for (let x = 0; x <= width; x += 3) {
      const position = x / Math.max(1, width);
      const envelope = Math.sin(Math.PI * position) ** 0.72;
      const y = center +
        Math.sin(position * (18 + layer * 3) + time * (2.4 + layer * 0.35)) *
        amplitude * envelope *
        (0.62 + Math.sin(position * 31 - time * 1.3) * 0.22);
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  });
}

// Forma de onda espejada compuesta por líneas verticales muy finas.
function drawPulse(context: CanvasRenderingContext2D, width: number, height: number, time: number, playing: boolean) {
  const center = height / 2;
  const count = Math.max(24, Math.min(92, Math.floor(width / 6)));
  const step = width / count;
  context.strokeStyle = "rgba(41, 126, 188, .78)";
  context.lineWidth = 1;

  for (let index = 0; index < count; index += 1) {
    const position = index / Math.max(1, count - 1);
    const envelope = Math.sin(Math.PI * position) ** 0.6;
    const signal =
      Math.sin(position * 21 + time * 2.7) * 0.45 +
      Math.sin(position * 47 - time * 1.8) * 0.2;
    const size = playing ? Math.max(1, Math.abs(signal) * envelope * height * 0.43) : 1;
    const x = index * step + step / 2;
    context.beginPath();
    context.moveTo(x, center - size);
    context.lineTo(x, center + size);
    context.stroke();
  }
}

function ResizeHandles() {
  const resize = async (direction: "North" | "South" | "East" | "West" | "NorthEast" | "NorthWest" | "SouthEast" | "SouthWest") => {
    await getCurrentWindow().startResizeDragging(direction);
  };

  return <>
    {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const).map((edge) => {
      const directions = { n: "North", s: "South", e: "East", w: "West", ne: "NorthEast", nw: "NorthWest", se: "SouthEast", sw: "SouthWest" } as const;
      return <span key={edge} className={`resize-handle ${edge}`} onMouseDown={(event) => { event.stopPropagation(); void resize(directions[edge]); }} />;
    })}
  </>;
}
