import { Search, X } from "lucide-react";
import type { FormEvent, RefObject } from "react";
import type { Language } from "../i18n";
import { translate } from "../i18n";

interface SearchBoxProps {
  value: string;
  loading: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  language: Language;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function SearchBox({ value, loading, inputRef, language, onChange, onSubmit }: SearchBoxProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="search-box" onSubmit={submit}>
      <Search size={18} aria-hidden="true" />
      <input
        ref={inputRef}
        aria-label={translate(language, "searchAria")}
        autoComplete="off"
        placeholder={translate(language, "searchPlaceholder")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button type="button" aria-label={translate(language, "clearSearch")} onClick={() => onChange("")}>
          <X size={16} />
        </button>
      )}
      <button className="search-submit" disabled={loading || value.trim().length < 2}>
        {loading ? translate(language, "searching") : translate(language, "search")}
      </button>
    </form>
  );
}
