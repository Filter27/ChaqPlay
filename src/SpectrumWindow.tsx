import { useEffect, useRef, useState } from "react";
import { PhysicalPosition, PhysicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { SpectrumMode, type SpectrumStyle } from "./components/SpectrumMode";

interface PlayerState {
  playing: boolean;
  playbackTime: number;
}

interface SavedGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GEOMETRY_KEY = "chaqplay:spectrum-geometry";
const STYLE_KEY = "chaqplay:spectrum-style";
const PINNED_KEY = "chaqplay:spectrum-pinned";

/**
 * Aplicación mínima cargada únicamente por la ventana "spectrum".
 * No crea otro reproductor: recibe el estado del audio desde la ventana main.
 */
export default function SpectrumWindow() {
  const [playing, setPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [style, setStyle] = useState<SpectrumStyle>(() =>
    (localStorage.getItem(STYLE_KEY) as SpectrumStyle | null) ?? "bars");
  const pinnedRef = useRef(localStorage.getItem(PINNED_KEY) !== "false");

  useEffect(() => {
    const spectrumWindow = getCurrentWindow();
    let disposed = false;
    let saveTimer = 0;
    const unlisteners: Array<() => void> = [];

    const saveGeometry = () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(async () => {
        const [position, size] = await Promise.all([
          spectrumWindow.outerPosition(),
          spectrumWindow.outerSize(),
        ]);
        const geometry: SavedGeometry = {
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
        };
        localStorage.setItem(GEOMETRY_KEY, JSON.stringify(geometry));
      }, 180);
    };

    void (async () => {
      // Restauramos la geometría antes de que el usuario muestre el espectro.
      const saved = readGeometry();
      if (saved) {
        await spectrumWindow.setSize(new PhysicalSize(saved.width, saved.height));
        await spectrumWindow.setPosition(new PhysicalPosition(saved.x, saved.y));
      }
      await invoke("sync_spectrum_preferences", {
        style,
        pinned: pinnedRef.current,
      });

      unlisteners.push(
        await spectrumWindow.onMoved(saveGeometry),
        await spectrumWindow.onResized(async () => {
          saveGeometry();
          const minimized = await spectrumWindow.isMinimized();
          // Windows "Mostrar escritorio" intenta minimizar todas las ventanas.
          // Si está fijado, el espectro se recupera inmediatamente.
          if (pinnedRef.current && minimized) {
            await spectrumWindow.unminimize();
            await spectrumWindow.show();
          } else if (minimized) {
            // Si el usuario desactivó "Fijar", la marca de la bandeja refleja
            // que el espectro dejó de estar visible.
            await invoke("set_spectrum_visible", { visible: false });
          }
        }),
        await listen<PlayerState>("player-state", ({ payload }) => {
          setPlaying(payload.playing);
          setPlaybackTime(payload.playbackTime);
        }),
        await listen<SpectrumStyle>("spectrum-style", ({ payload }) => {
          setStyle(payload);
          localStorage.setItem(STYLE_KEY, payload);
        }),
        await listen<boolean>("spectrum-pinned", ({ payload }) => {
          pinnedRef.current = payload;
          localStorage.setItem(PINNED_KEY, String(payload));
        }),
      );

      if (disposed) unlisteners.forEach((unlisten) => unlisten());
    })();

    return () => {
      disposed = true;
      window.clearTimeout(saveTimer);
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  return <SpectrumMode
    playing={playing}
    playbackTime={playbackTime}
    style={style}
  />;
}

function readGeometry(): SavedGeometry | null {
  try {
    const value = JSON.parse(localStorage.getItem(GEOMETRY_KEY) ?? "null") as SavedGeometry | null;
    if (!value || value.width < 220 || value.height < 36) return null;
    return value;
  } catch {
    return null;
  }
}
