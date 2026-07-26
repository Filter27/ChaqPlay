import { AudioLines, Heart, ListMusic, LoaderCircle, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { formatDuration } from "../lib/format";
import type { Language } from "../i18n";
import { translate } from "../i18n";
import type { Track } from "../types";
import { TrackArtwork } from "./TrackArtwork";

interface PlayerBarProps {
  track: Track | null;
  playing: boolean;
  loading: boolean;
  progress: number;
  duration: number;
  volume: number;
  favorite: boolean;
  queueSize: number;
  language: Language;
  spectrumVisible: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (value: number) => void;
  onVolume: (value: number) => void;
  onToggleFavorite: () => void;
  onSpectrum: () => void;
}

export function PlayerBar({
  track,
  playing,
  loading,
  progress,
  duration,
  volume,
  favorite,
  queueSize,
  language,
  spectrumVisible,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  onVolume,
  onToggleFavorite,
  onSpectrum,
}: PlayerBarProps) {
  return (
    <footer className="player-bar">
      <div className="now-playing">
        <TrackArtwork src={track?.thumbnail ?? ""} title={track?.title ?? translate(language, "noPlayback")} large />
        <div>
          <strong>{track?.title ?? translate(language, "chooseSong")}</strong>
          <span>{track?.artist ?? translate(language, "ready")}</span>
        </div>
        <button className={favorite ? "player-action loved" : "player-action"} disabled={!track} onClick={onToggleFavorite}>
          <Heart size={18} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="transport">
        <div className="transport-buttons">
          <button aria-label={translate(language, "previous")} onClick={onPrevious} disabled={!track}><SkipBack size={18} fill="currentColor" /></button>
          <button className="play-main" aria-label={translate(language, playing ? "pause" : "play")} onClick={onTogglePlay} disabled={!track || loading}>
            {loading ? <LoaderCircle className="spin" size={20} /> : playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
          </button>
          <button aria-label={translate(language, "next")} onClick={onNext} disabled={!track}><SkipForward size={18} fill="currentColor" /></button>
        </div>
        <div className="timeline">
          <span>{formatDuration(progress)}</span>
          <input
            aria-label={translate(language, "progress")}
            type="range"
            min="0"
            max={duration || 0}
            step="1"
            value={Math.min(progress, duration || 0)}
            onChange={(event) => onSeek(Number(event.target.value))}
          />
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="player-extras">
        <button
          className={spectrumVisible ? "spectrum-button active" : "spectrum-button"}
          disabled={!track}
          aria-pressed={spectrumVisible}
          onClick={onSpectrum}
          title={translate(language, spectrumVisible ? "hideSpectrum" : "showSpectrum")}
        ><AudioLines size={18} /></button>
        <span className="queue-count"><ListMusic size={18} />{queueSize}</span>
        {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        <input
          aria-label={translate(language, "volume")}
          className="volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(event) => onVolume(Number(event.target.value))}
        />
      </div>
    </footer>
  );
}
