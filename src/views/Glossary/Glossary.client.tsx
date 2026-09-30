import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { filterTerms, groupTerms, termLetter, type GlossaryItem } from "./model.js";
import classes from "./component.module.css";

export interface GlossaryViewProps {
  showUnusedLetters?: boolean;
  id: string;
  title: string;
  introduction?: string;
  explanation?: string;
  updatedLabel?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchHelp?: string;
  entries: GlossaryItem[];
  isEditMode?: boolean;
  children?: ReactNode;
}

export function TermRow({ entry }: { entry: GlossaryItem }) {
  return (
    <article className={classes.card}>
      <h3>
        <a href={entry.url}>{entry.title}</a>
      </h3>
      <p>{entry.summary}</p>
    </article>
  );
}

export default function Glossary({
  id,
  searchLabel,
  searchPlaceholder,
  searchHelp,
  showUnusedLetters = false,
  entries,
  isEditMode,
  children,
}: GlossaryViewProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const groups = groupTerms(filterTerms(entries, query));
  const letters = showUnusedLetters
    ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
    : groups.map(([letter]) => letter);
  if (showUnusedLetters && entries.some((entry) => termLetter(entry.title) === "#"))
    letters.push("#");
  const count = groups.reduce((total, [, terms]) => total + terms.length, 0);
  const anchor = (letter: string) => `${id}-letter-${letter === "#" ? "other" : letter}`;

  return (
    <div className={classes.glossary}>
      <section
        className={classes.directory}
        aria-label={t("glossary.directory")}
        data-theme="cloudy"
      >
        <div className={classes.inner}>
          {isEditMode ? (
            <p className={classes.editHint}>{t("glossary.editHint")}</p>
          ) : (
            <>
              <div className={classes.controls}>
                <div
                  className={classes.search}
                  role="search"
                  aria-label={searchLabel || t("glossary.search")}
                >
                  <label htmlFor={`${id}-search`}>{searchLabel || t("glossary.search")}</label>
                  <div className={classes.inputRow}>
                    <svg
                      className={classes.searchIcon}
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="10" cy="10" r="6" />
                      <path d="m15 15 5 5" />
                    </svg>
                    <input
                      id={`${id}-search`}
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={searchPlaceholder || t("glossary.placeholder")}
                      aria-describedby={`${id}-help`}
                    />
                  </div>
                  <p id={`${id}-help`}>{searchHelp || t("glossary.searchHelp")}</p>
                </div>
                <nav id={`${id}-index`} className={classes.index} aria-label={t("glossary.browse")}>
                  <p>{t("glossary.browse")}</p>
                  <ul>
                    {letters.map((letter) => (
                      <li key={letter}>
                        {groups.some(([key]) => key === letter) ? (
                          <a
                            href={`#${anchor(letter)}`}
                            aria-label={t("glossary.goToLetter", { letter })}
                          >
                            {letter}
                          </a>
                        ) : (
                          <span aria-disabled="true">{letter}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
              <p className={classes.results} role="status" aria-live="polite" aria-atomic="true">
                {query ? t("glossary.results", { count }) : ""}
              </p>
              {count === 0 && (
                <div className={classes.empty}>
                  <h2>{t("glossary.noResults")}</h2>
                  <p>{t("glossary.tryAgain")}</p>
                  {query && (
                    <button type="button" onClick={() => setQuery("")}>
                      {t("glossary.clear")}
                    </button>
                  )}
                </div>
              )}
              {groups.map(([letter, terms]) => (
                <section className={classes.group} key={letter} aria-labelledby={anchor(letter)}>
                  <div className={classes.groupHeading}>
                    <h2 id={anchor(letter)} tabIndex={-1}>
                      {letter}
                    </h2>
                    <a className={classes.backToIndex} href={`#${id}-index`}>
                      {t("glossary.backToIndex")}
                    </a>
                  </div>
                  <div className={classes.cards}>
                    {terms.map((entry) => (
                      <TermRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
          {children}
        </div>
      </section>
    </div>
  );
}
