import { useTranslation } from "react-i18next";
import type { GlossaryItem } from "../../views/Glossary/model.js";
import classes from "./component.module.css";

export interface EntryResource {
  id: string;
  title: string;
  url: string;
  kind: string;
  description?: string;
}

export interface EntryViewProps {
  title: string;
  summary: string;
  aliases?: string[];
  body?: string;
  definitionTitle?: string;
  exampleTitle?: string;
  example?: string;
  faq?: string;
  updatedLabel?: string;
  comparisonTitle?: string;
  comparison?: string;
  indexUrl?: string;
  resources: EntryResource[];
  relatedTerms: GlossaryItem[];
  isEditMode?: boolean;
}

export default function Entry({
  title,
  summary,
  aliases = [],
  body,
  definitionTitle,
  comparisonTitle,
  comparison,
  example,
  exampleTitle,
  faq,
  updatedLabel,
  indexUrl,
  resources,
  relatedTerms,
  isEditMode,
}: EntryViewProps) {
  const { t } = useTranslation();
  const further = resources.find((resource) => resource.kind === "article") || resources[0];
  const cta = resources.find((resource) => resource.kind === "solution") || resources[0];
  return (
    <article className={classes.entry} data-theme="day">
      <div className={classes.inner}>
        <div className={classes.reading}>
          <div className={classes.body}>
            <header className={classes.heading}>
              <p className={classes.eyebrow}>{t("glossary.term")}</p>
              <h1>{title}</h1>
              {aliases.length > 0 && (
                <p className={classes.aliases}>
                  {t("glossary.aliases", { aliases: aliases.join(", ") })}
                </p>
              )}
              <p className={classes.summary}>{summary}</p>
            </header>
            <section aria-labelledby="definition">
              <h2 id="definition" tabIndex={-1}>
                {definitionTitle || t("glossary.definitionTitle")}
              </h2>
              {body ? (
                <div className="_richtext" dangerouslySetInnerHTML={{ __html: body }} />
              ) : (
                <p>{summary}</p>
              )}
            </section>
            {comparison ? (
              <section className={classes.comparison} aria-labelledby="distinction">
                <h2 id="distinction" tabIndex={-1}>
                  {comparisonTitle || t("glossary.distinction")}
                </h2>
                <div className="_richtext" dangerouslySetInnerHTML={{ __html: comparison }} />
              </section>
            ) : isEditMode ? (
              <p className={classes.editorNote}>{t("glossary.comparisonMissing")}</p>
            ) : null}
            {example && (
              <section aria-labelledby="example">
                <h2 id="example" tabIndex={-1}>
                  {exampleTitle || t("glossary.example")}
                </h2>
                <div className={classes.example}>
                  <div className="_richtext" dangerouslySetInnerHTML={{ __html: example }} />
                </div>
              </section>
            )}
            {faq && (
              <section className={classes.faq} aria-labelledby="faq">
                <h2 id="faq" tabIndex={-1}>
                  {t("glossary.faq")}
                </h2>
                <div className="_richtext" dangerouslySetInnerHTML={{ __html: faq }} />
              </section>
            )}
            {resources.length > 0 ? (
              <section className={classes.resources} aria-labelledby="resources">
                <div className={classes.sectionHeading}>
                  <h2 id="resources" tabIndex={-1}>
                    {t("glossary.resourcesTitle", {
                      term: title,
                      interpolation: { escapeValue: false },
                    })}
                  </h2>
                  <span className={classes.count}>
                    {t("glossary.resourceCount", { count: resources.length })}
                  </span>
                </div>
                <p>{t("glossary.resourcesIntro")}</p>
                <ul className={classes.resourceGrid}>
                  {resources.slice(0, 6).map((resource) => (
                    <li key={resource.id}>
                      <a href={resource.url} className={classes.resourceCard}>
                        <span className={classes.resourceKind}>
                          {t(`glossary.kinds.${resource.kind}`)}
                        </span>
                        <h3>{resource.title}</h3>
                      </a>
                    </li>
                  ))}
                </ul>
                {resources.length > 6 && (
                  <details className={classes.moreResources}>
                    <summary>{t("glossary.showAllResources", { count: resources.length })}</summary>
                    <ul className={classes.resourceGrid}>
                      {resources.slice(6).map((resource) => (
                        <li key={resource.id}>
                          <a href={resource.url} className={classes.resourceCard}>
                            <span className={classes.resourceKind}>
                              {t(`glossary.kinds.${resource.kind}`)}
                            </span>
                            <h3>{resource.title}</h3>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            ) : isEditMode ? (
              <p className={classes.editorNote}>{t("glossary.resourcesMissing")}</p>
            ) : null}
            {cta && (
              <section className={classes.cta} data-theme="night" aria-labelledby="topic-cta">
                <h2 id="topic-cta">
                  {t("glossary.topicCta", { term: title, interpolation: { escapeValue: false } })}
                </h2>
                <p>{cta.title}</p>
                <a href={cta.url}>{t("glossary.readResource")}</a>
              </section>
            )}
          </div>
          <aside className={classes.sidebar} aria-label={t("glossary.about")}>
            <div className={classes.sidebarContents}>
              {relatedTerms.length > 0 && (
                <section className={classes.panel} aria-labelledby="related">
                  <h2 id="related" className={classes.eyebrow}>
                    {t("glossary.related")}
                  </h2>
                  <ul className={classes.relatedList}>
                    {relatedTerms.map((term) => (
                      <li key={term.id}>
                        <a href={term.url}>{term.title}</a>
                        <p>{term.summary}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className={classes.panel} aria-labelledby="about-entry">
                <h2 id="about-entry" className={classes.eyebrow}>
                  {t("glossary.about")}
                </h2>
                {updatedLabel && (
                  <dl className={classes.meta}>
                    <dt>{t("glossary.updated")}</dt>
                    <dd>{updatedLabel}</dd>
                  </dl>
                )}
                {further && (
                  <>
                    <p className={classes.metaLabel}>{t("glossary.goFurther")}</p>
                    <a href={further.url}>{further.title}</a>
                  </>
                )}
                {indexUrl && (
                  <a className={classes.allTerms} href={indexUrl}>
                    {t("glossary.allTerms")}
                  </a>
                )}
              </section>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}
