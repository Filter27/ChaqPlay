export type View = "home" | "search" | "favorites" | "history";

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number | null;
  thumbnail: string;
  source: "youtube";
}

export interface StreamInfo {
  url: string;
  kind: "direct" | "hls";
  duration: number | null;
}

export interface PlaybackState {
  current: Track | null;
  playing: boolean;
  loading: boolean;
  progress: number;
  duration: number;
  volume: number;
}
