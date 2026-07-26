import { invoke } from "@tauri-apps/api/core";
import type { StreamInfo, Track } from "../types";

const demoTracks: Track[] = [
  {
    id: "demo-1",
    title: "Tu búsqueda aparecerá aquí",
    artist: "Vista previa del diseño",
    duration: 224,
    thumbnail: "",
    source: "youtube",
  },
  {
    id: "demo-2",
    title: "Abre la aplicación de Windows para reproducir",
    artist: "ChaqPlay",
    duration: 198,
    thumbnail: "",
    source: "youtube",
  },
];

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function searchYouTube(query: string): Promise<Track[]> {
  if (!isTauriRuntime()) {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    return demoTracks.map((track, index) => ({
      ...track,
      title: index === 0 ? `Resultado de ejemplo para “${query}”` : track.title,
    }));
  }

  return invoke<Track[]>("search_youtube", { query });
}

export async function resolveYouTubeStream(videoId: string, attempt: number): Promise<StreamInfo> {
  if (!isTauriRuntime()) {
    throw new Error("La reproducción real está disponible en la aplicación de Windows.");
  }

  const audio = await invoke<{ url: string; kind: "direct" | "hls"; duration: number | null }>(
    "resolve_youtube",
    { videoId, attempt },
  );
  return {
    url: audio.url,
    kind: audio.kind,
    duration: audio.duration,
  };
}
