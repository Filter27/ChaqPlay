import type { Track } from "../types";

const PREFIX = "chaqplay:";

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // The player keeps working when storage is unavailable.
  }
}

export function prependUnique(items: Track[], track: Track, limit = 50): Track[] {
  return [track, ...items.filter((item) => item.id !== track.id)].slice(0, limit);
}
