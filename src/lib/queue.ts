import type { Track } from "../types";

/**
 * Devuelve las canciones situadas después de la pista seleccionada.
 * El reproductor consume este arreglo desde el inicio cada vez que termina
 * una canción, por eso preservamos exactamente el orden visible.
 */
export function buildFollowingQueue(tracks: Track[], selectedId: string): Track[] {
  const selectedIndex = tracks.findIndex((track) => track.id === selectedId);
  return selectedIndex < 0 ? [] : tracks.slice(selectedIndex + 1);
}
