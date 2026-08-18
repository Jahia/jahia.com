import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";
import classes from "./Search.module.css";

export type SearchResult = { url: string; title: string; snippet: string };
export type SearchState = {
  query: string;
  requested: boolean;
  invalid: boolean;
  results: SearchResult[];
};

const subscribeToBrowser = () => () => undefined;
const getBrowserSnapshot = () => true;
const getServerSnapshot = () => false;

const labels = {
  fr: {
    title: "Recherche Jahia",
    placeholder: "Rechercher une page publiée…",
    submit: "Rechercher",
    loading: "Recherche en cours…",
    error: "La recherche n’a pas pu aboutir. Veuillez réessayer.",
    close: "Fermer",
    empty: "Aucune page publiée ne contient ces mots-clés.",
    results: "résultat(s)",
    invalid: "La recherche doit contenir entre 2 et 120 caractères, avec 12 mots maximum.",
  },
  en: {
    title: "Jahia Search",
    placeholder: "Search published pages…",
    submit: "Search",
    loading: "Searching…",
    error: "The search could not be completed. Please try again.",
    close: "Close",
    empty: "No published page contains these keywords.",
    results: "result(s)",
    invalid: "Search must contain 2 to 120 characters, with no more than 12 words.",
  },
};

export default function SearchDialog({
  open,
  language,
  initialSearch,
  onClose,
}: {
  open: boolean;
  language: string;
  initialSearch: SearchState;
  onClose: () => void;
}) {
  const t = language === "fr" ? labels.fr : labels.en;
  const mounted = useSyncExternalStore(subscribeToBrowser, getBrowserSnapshot, getServerSnapshot);
  const [search, setSearch] = useState<SearchState>(initialSearch);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => input.current?.focus());
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panel.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  useEffect(() => () => request.current?.abort(), []);

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") || "").slice(0, 120);
    const url = new URL(window.location.href);
    url.searchParams.set("search", value);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setFailed(false);

    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        headers: { Accept: "text/html" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Search request failed with ${response.status}`);

      const document = new DOMParser().parseFromString(await response.text(), "text/html");
      const encoded = document
        .querySelector<HTMLElement>("[data-jahia-search-payload]")
        ?.getAttribute("data-jahia-search-payload");
      if (!encoded) throw new Error("Search payload is missing");

      const payload = JSON.parse(decodeURIComponent(encoded)) as Partial<SearchState>;
      if (
        typeof payload.query !== "string" ||
        typeof payload.requested !== "boolean" ||
        typeof payload.invalid !== "boolean" ||
        !Array.isArray(payload.results)
      ) {
        throw new Error("Search payload is invalid");
      }

      const safeResults = payload.results.flatMap((result) => {
        if (
          !result ||
          typeof result.url !== "string" ||
          typeof result.title !== "string" ||
          typeof result.snippet !== "string"
        ) {
          return [];
        }
        const resultUrl = new URL(result.url, window.location.origin);
        if (resultUrl.origin !== window.location.origin) return [];
        return [
          {
            url: `${resultUrl.pathname}${resultUrl.search}${resultUrl.hash}`,
            title: result.title,
            snippet: result.snippet,
          },
        ];
      });

      setSearch({
        query: payload.query.slice(0, 120),
        requested: payload.requested,
        invalid: payload.invalid,
        results: safeResults.slice(0, 20),
      });
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFailed(true);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  };

  if (!open || !mounted) return null;

  const status = loading
    ? t.loading
    : failed
      ? t.error
      : search.invalid
        ? t.invalid
        : search.requested
          ? search.results.length > 0
            ? `${search.results.length} ${t.results}`
            : t.empty
          : "";

  return createPortal(
    <div className={classes.overlay} role="presentation" onMouseDown={onClose}>
      <section
        ref={panel}
        className={classes.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jahia-search-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={classes.header}>
          <div>
            <span>Jahia.com</span>
            <h2 id="jahia-search-title">{t.title}</h2>
          </div>
          <button type="button" className={classes.close} onClick={onClose} aria-label={t.close}>
            <span className="i-ri:close-large-line" aria-hidden="true" />
          </button>
        </header>
        <form className={classes.form} method="get" action="" onSubmit={submitSearch}>
          <label className={classes.field}>
            <span className="i-ri:search-line" aria-hidden="true" />
            <span className={classes.srOnly}>{t.placeholder}</span>
            <input
              ref={input}
              name="search"
              type="search"
              minLength={2}
              maxLength={120}
              required
              autoComplete="off"
              spellCheck={false}
              defaultValue={search.query}
              placeholder={t.placeholder}
            />
          </label>
          <button type="submit" disabled={loading}>
            {t.submit}
          </button>
        </form>
        <p className={classes.status} role="status" aria-live="polite" aria-busy={loading}>
          {status}
        </p>
        <ol className={classes.results}>
          {search.results.map((result) => (
            <li key={result.url}>
              <a href={result.url}>
                <strong>{result.title}</strong>
                {result.snippet && <p>{result.snippet}</p>}
              </a>
            </li>
          ))}
        </ol>
      </section>
    </div>,
    document.body,
  );
}
