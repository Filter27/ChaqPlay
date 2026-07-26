import { Music2 } from "lucide-react";

export function TrackArtwork({ src, title, large = false }: { src: string; title: string; large?: boolean }) {
  return (
    <div className={large ? "artwork large" : "artwork"}>
      {src ? <img src={src} alt="" draggable={false} /> : <Music2 aria-label={title} size={large ? 30 : 20} />}
    </div>
  );
}
