import { Heart, ListPlus, MoreHorizontal, Pause, Play } from "lucide-react";
import { formatDuration } from "../lib/format";
import type { Language } from "../i18n";
import { translate } from "../i18n";
import type { Track } from "../types";
import { TrackArtwork } from "./TrackArtwork";

interface TrackListProps {
  tracks: Track[];
  currentId?: string;
  playing: boolean;
  favorites: Track[];
  language: Language;
  emptyTitle: string;
  emptyText: string;
  onPlay: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onQueue: (track: Track) => void;
}

export function TrackList({
  tracks,
  currentId,
  playing,
  favorites,
  language,
  emptyTitle,
  emptyText,
  onPlay,
  onToggleFavorite,
  onQueue,
}: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="empty-state">
        <span><MoreHorizontal size={22} /></span>
        <h3>{emptyTitle}</h3>
        <p>{emptyText}</p>
      </div>
    );
  }

  const favoriteIds = new Set(favorites.map((item) => item.id));

  return (
    <div className="track-list">
      {tracks.map((track, index) => {
        const active = currentId === track.id;
        return (
          <article className={active ? "track-row active" : "track-row"} key={track.id}>
            <button className="track-play" aria-label={`${translate(language, "play")} ${track.title}`} onClick={() => onPlay(track)}>
              <span className="track-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="track-play-icon">
                {active && playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              </span>
            </button>
            <TrackArtwork src={track.thumbnail} title={track.title} />
            <div className="track-copy">
              <strong>{track.title}</strong>
              <span>{track.artist}</span>
            </div>
            <span className="track-source">YouTube</span>
            <span className="track-duration">{formatDuration(track.duration)}</span>
            <button
              className={favoriteIds.has(track.id) ? "row-action loved" : "row-action"}
              aria-label={translate(language, "addFavorite")}
              onClick={() => onToggleFavorite(track)}
            >
              <Heart size={17} fill={favoriteIds.has(track.id) ? "currentColor" : "none"} />
            </button>
            <button className="row-action" aria-label={translate(language, "addQueue")} onClick={() => onQueue(track)}>
              <ListPlus size={18} />
            </button>
          </article>
        );
      })}
    </div>
  );
}
