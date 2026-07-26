import { Clock3, Heart, Home, Moon, Search, Sun, TvMinimalPlay } from "lucide-react";
import type { Language, TranslationKey } from "../i18n";
import { translate } from "../i18n";
import type { View } from "../types";
import { Logo } from "./Logo";

interface SidebarProps {
  view: View;
  theme: "dark" | "light";
  language: Language;
  onChange: (view: View) => void;
  onToggleTheme: () => void;
}

const items: Array<{ id: View; label: TranslationKey; icon: typeof Home }> = [
  { id: "home", label: "home", icon: Home },
  { id: "search", label: "search", icon: Search },
  { id: "favorites", label: "favorites", icon: Heart },
  { id: "history", label: "history", icon: Clock3 },
];

export function Sidebar({ view, theme, language, onChange, onToggleTheme }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Logo />
      <nav aria-label="Navegación principal">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            className={view === id ? "nav-item active" : "nav-item"}
            key={id}
            onClick={() => onChange(id)}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{translate(language, label)}</span>
          </button>
        ))}
      </nav>
      <button className="theme-toggle" onClick={onToggleTheme}>
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        <span>{translate(language, theme === "dark" ? "lightMode" : "darkMode")}</span>
      </button>
      <div className="source-card">
        <span className="source-icon"><TvMinimalPlay size={17} /></span>
        <span><strong>YouTube</strong><small>{translate(language, "activeSource")}</small></span>
        <i />
      </div>
      <p className="sidebar-note">{translate(language, "spotifySoon")}</p>
    </aside>
  );
}
