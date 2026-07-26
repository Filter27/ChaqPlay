import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowRight, Headphones, History, Radio, Sparkles } from "lucide-react";
import { PlayerBar } from "./components/PlayerBar";
import { SearchBox } from "./components/SearchBox";
import { Sidebar } from "./components/Sidebar";
import { TrackList } from "./components/TrackList";
import type { Language, TranslationKey } from "./i18n";
import { translate } from "./i18n";
import { prependUnique, readStored, writeStored } from "./lib/storage";
import { buildFollowingQueue } from "./lib/queue";
import { isTauriRuntime, resolveYouTubeStream, searchYouTube } from "./services/youtube";
import type { Track, View } from "./types";

function waitForMediaReady(audio: HTMLAudioElement, timeoutMs = 12_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      resolve();
      return;
    }
    const cleanup = () => {
      window.clearTimeout(timer);
      audio.removeEventListener("loadedmetadata", ready);
      audio.removeEventListener("error", failed);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("unsupported-media")); };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("media-timeout"));
    }, timeoutMs);
    audio.addEventListener("loadedmetadata", ready, { once: true });
    audio.addEventListener("error", failed, { once: true });
  });
}

export default function App() {
  // El elemento <audio> vive fuera de las vistas que se ocultan. Así nunca se
  // desmonta al cambiar al espectro y la música puede continuar sin cortes.
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const playbackRequestRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<Track[]>(() => readStored("favorites", []));
  const [history, setHistory] = useState<Track[]>(() => readStored("history", []));
  const [queue, setQueue] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => readStored("volume", 0.72));
  const [message, setMessage] = useState("");
  const [spectrumVisible, setSpectrumVisible] = useState(false);
  const [language, setLanguage] = useState<Language>(() => readStored("language", "es"));
  const [theme, setTheme] = useState<"dark" | "light">(() => readStored(
    "theme",
    window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
  ));
  useEffect(() => writeStored("favorites", favorites), [favorites]);
  useEffect(() => writeStored("history", history), [history]);
  useEffect(() => writeStored("volume", volume), [volume]);
  const t = useCallback((key: TranslationKey) => translate(language, key), [language]);
  const quickSearches = language === "es"
    ? ["Música para trabajar", "Pop latino", "Rock clásico", "Lo-fi chill"]
    : ["Music for work", "Latin pop", "Classic rock", "Lo-fi chill"];

  useEffect(() => {
    writeStored("language", language);
    document.documentElement.lang = language;
    if (isTauriRuntime()) void invoke("sync_language", { language });
  }, [language]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStored("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      artwork: current.thumbnail ? [{ src: current.thumbnail, sizes: "480x360" }] : [],
    });
  }, [current]);

  const executeSearch = useCallback(async (forcedQuery?: string) => {
    const term = (forcedQuery ?? query).trim();
    if (term.length < 2) return;
    setQuery(term);
    setLastQuery(term);
    setView("search");
    setSearching(true);
    setMessage("");
    try {
      setResults(await searchYouTube(term));
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : t("searchError"));
    } finally {
      setSearching(false);
    }
  }, [query, t]);

  const playTrack = useCallback(async (track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (current?.id === track.id && audio.src) {
      if (audio.paused) {
        await audio.play();
      }
      else audio.pause();
      return;
    }

    setCurrent(track);
    setLoading(true);
    setProgress(0);
    setDuration(track.duration ?? 0);
    setMessage("");
    const requestId = ++playbackRequestRef.current;

    try {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (requestId !== playbackRequestRef.current) return;
        try {
          hlsRef.current?.destroy();
          hlsRef.current = null;
          audio.removeAttribute("src");
          audio.load();

          const stream = await resolveYouTubeStream(track.id, attempt);
          if (requestId !== playbackRequestRef.current) return;
          audio.volume = volume;

          if (stream.kind === "hls") {
            // HLS se importa únicamente en el caso de respaldo. Las canciones
            // directas no cargan esta biblioteca ni consumen memoria extra.
            const { default: Hls } = await import("hls.js/light");
            if (!Hls.isSupported()) throw new Error("hls-not-supported");
            const hls = new Hls({
              // Para audio no necesitamos otro proceso WebWorker; mantenerlo
              // apagado reduce memoria y procesos auxiliares de WebView2.
              enableWorker: false,
              backBufferLength: 30,
              maxBufferLength: 30,
            });
            hlsRef.current = hls;
            hls.attachMedia(audio);
            hls.loadSource(stream.url);
          } else {
            audio.src = stream.url;
            audio.load();
          }

          await waitForMediaReady(audio);
          if (requestId !== playbackRequestRef.current) return;
          await audio.play();
          setHistory((items) => prependUnique(items, track));
          return;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError ?? new Error("no-compatible-stream");
    } catch (error) {
      setPlaying(false);
      console.warn("No compatible YouTube stream was found", error);
      setMessage(t("noCompatibleAudio"));
    } finally {
      setLoading(false);
    }
  }, [current, volume, t]);

  useEffect(() => () => {
    hlsRef.current?.destroy();
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) {
      setPlaying(false);
      return;
    }
    const [next, ...rest] = queue;
    setQueue(rest);
    void playTrack(next);
  }, [playTrack, queue]);

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime > 4) {
      audio.currentTime = 0;
      return;
    }
    const previous = history.find((track) => track.id !== current?.id);
    if (previous) void playTrack(previous);
  }, [current, history, playTrack]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => void audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("nexttrack", playNext);
    navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [playNext, playPrevious]);

  const toggleFavorite = (track: Track) => {
    setFavorites((items) => items.some((item) => item.id === track.id)
      ? items.filter((item) => item.id !== track.id)
      : [track, ...items]);
  };

  const addToQueue = (track: Track) => {
    setQueue((items) => [...items, track]);
    setMessage(`“${track.title}” ${t("addedQueue")}`);
  };

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) {
      void audio.play();
    }
    else audio.pause();
  }, [current]);

  const toggleSpectrum = useCallback(async () => {
    if (!isTauriRuntime()) {
      setMessage(t("spectrumWindowsOnly"));
      return;
    }
    await invoke("set_spectrum_visible", { visible: !spectrumVisible });
  }, [spectrumVisible, t]);

  // La ventana principal es la única dueña del audio. El espectro recibe solo
  // datos pequeños para animarse y nunca duplica ni interrumpe la reproducción.
  useEffect(() => {
    if (!isTauriRuntime()) return;
    void emit("player-state", {
      playing,
      playbackTime: progress,
    });
  }, [playing, progress]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    let unlistenResize: undefined | (() => void);
    let unlistenClose: undefined | (() => void);
    void (async () => {
      const window = getCurrentWindow();
      unlistenResize = await window.onResized(async () => {
        if (await window.isMinimized() && await invoke<boolean>("hide_on_minimize_enabled")) {
          await window.hide();
        }
      });
      unlistenClose = await window.onCloseRequested(async (event) => {
        event.preventDefault();
        await window.hide();
      });
      if (disposed) { unlistenResize(); unlistenClose(); }
    })();
    return () => { disposed = true; unlistenResize?.(); unlistenClose?.(); };
  }, []);

  // La bandeja y el botón visual comparten una única fuente de verdad.
  // Cualquier cambio en uno se refleja de inmediato en el otro.
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    let unlistenSpectrum: undefined | (() => void);
    let unlistenLanguage: undefined | (() => void);
    void (async () => {
      unlistenSpectrum = await listen<boolean>("spectrum-visibility", ({ payload }) => {
        setSpectrumVisible(payload);
      });
      unlistenLanguage = await listen<Language>("app-language", ({ payload }) => {
        setLanguage(payload);
      });
      if (disposed) {
        unlistenSpectrum();
        unlistenLanguage();
      }
    })();
    return () => {
      disposed = true;
      unlistenSpectrum?.();
      unlistenLanguage?.();
    };
  }, []);

  const seek = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setProgress(value);
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  };

  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.id)), [favorites]);
  const visibleTracks = view === "favorites" ? favorites : view === "history" ? history : results;
  const sectionTitle = view === "favorites"
    ? t("yourFavorites")
    : view === "history"
      ? t("recentlyPlayed")
      : lastQuery
        ? `${t("resultsFor")} “${lastQuery}”`
        : t("typeSong");
  const sectionSubtitle = view === "favorites"
    ? `${favorites.length} ${t(favorites.length === 1 ? "songSaved" : "songsSaved")}`
    : view === "history"
      ? t("localHistory")
      : results.length > 0
        ? `${results.length} ${t("resultsFrom")}`
        : t("typeSong");

  // Al elegir un resultado, los elementos posteriores pasan a ser la cola.
  // De este modo el evento "ended" siempre conoce cuál canción debe continuar.
  const playFromVisibleList = (track: Track) => {
    if (current?.id !== track.id) {
      setQueue(buildFollowingQueue(visibleTracks, track.id));
    }
    void playTrack(track);
  };

  const openSearchAndFocus = () => {
    setView("search");
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const audioPlayer = <audio
    key="chaqplay-audio"
    ref={audioRef}
    preload="auto"
    onPlay={() => {
      setPlaying(true);
    }}
    onPause={() => setPlaying(false)}
    onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
    onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : current?.duration ?? 0)}
    onEnded={playNext}
    onError={() => {
      if (!loading && audioRef.current?.src) setMessage(t("streamExpired"));
    }}
  />;

  return (
    <>{audioPlayer}<div className="app-shell">
      <Sidebar view={view} theme={theme} language={language} onChange={setView} onToggleTheme={() => setTheme((value) => value === "dark" ? "light" : "dark")} />
      <main className="main-content">
        <header className="topbar">
          <SearchBox inputRef={searchInputRef} value={query} loading={searching} language={language} onChange={setQuery} onSubmit={() => void executeSearch()} />
          <span className={isTauriRuntime() ? "status-pill online" : "status-pill"}>
            <i />{t(isTauriRuntime() ? "engineReady" : "designPreview")}
          </span>
        </header>

        {view === "home" ? (
          <div className="home-view">
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow"><Sparkles size={14} /> {t("heroEyebrow")}</span>
                <h1>{t("heroTitle")}<br /><em>{t("heroEmphasis")}</em></h1>
                <p>{t("heroText")}</p>
                <button className="primary-button" onClick={openSearchAndFocus}>
                  {t("startListening")} <ArrowRight size={18} />
                </button>
              </div>
              <div className="hero-orbit" aria-hidden="true">
                <div className="orbit outer" />
                <div className="orbit inner" />
                <div className="hero-disc">
                  <span /><span /><span /><span />
                  <div className="disc-center"><Headphones size={26} /></div>
                </div>
              </div>
            </section>

            <section className="quick-section">
              <div className="section-heading">
                <div><span className="section-kicker">{t("discover")}</span><h2>{t("whatListen")}</h2></div>
              </div>
              <div className="quick-grid">
                {quickSearches.map((item, index) => (
                  <button key={item} onClick={() => void executeSearch(item)}>
                    <span className={`quick-icon tone-${index + 1}`}>{index === 0 ? <Radio /> : index === 1 ? <Sparkles /> : index === 2 ? <Headphones /> : <History />}</span>
                    <strong>{item}</strong>
                    <small>{t("searchYouTube")}</small>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <section className="library-view">
            <div className="section-heading library-heading">
              <div><span className="section-kicker">{t(view === "search" ? "searchSection" : "librarySection")}</span><h2>{sectionTitle}</h2><p>{sectionSubtitle}</p></div>
            </div>
            {searching ? (
              <div className="search-skeleton">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>
            ) : (
              <TrackList
                tracks={visibleTracks}
                currentId={current?.id}
                playing={playing}
                favorites={favorites}
                language={language}
                emptyTitle={t(view === "favorites" ? "noFavorites" : view === "history" ? "emptyHistory" : "noResults")}
                emptyText={t(view === "search" ? "trySearch" : "itemsAppear")}
                onPlay={playFromVisibleList}
                onToggleFavorite={toggleFavorite}
                onQueue={addToQueue}
              />
            )}
          </section>
        )}
      </main>

      {message && <div className="toast" role="status">{message}</div>}
      <PlayerBar
        track={current}
        playing={playing}
        loading={loading}
        progress={progress}
        duration={duration}
        volume={volume}
        favorite={current ? favoriteIds.has(current.id) : false}
        queueSize={queue.length}
        language={language}
        spectrumVisible={spectrumVisible}
        onTogglePlay={togglePlay}
        onPrevious={playPrevious}
        onNext={playNext}
        onSeek={seek}
        onVolume={changeVolume}
        onToggleFavorite={() => current && toggleFavorite(current)}
        onSpectrum={() => void toggleSpectrum()}
      />
    </div></>
  );
}
