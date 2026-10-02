import { useTranslation } from "react-i18next";
import type { GlossaryItem } from "../../views/Glossary/model.js";
import { CTA } from "../../mixins/CTA/index.jsx";
import { splitDefinition } from "./inlineTerms.js";
import { sanitizeHtml } from "./sanitizeHtml.js";
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
  editorialAuthor?: string;
  editorialDateLabel?: string;
  body?: string;
  definitionTitle?: string;
  exampleTitle?: string;
  example?: string;
  faq?: string;
  comparisonTitle?: string;
  comparison?: string;
  indexUrl?: string;
  resources: EntryResource[];
  resourceDisplayCount?: "3" | "6" | "9";
  relatedTerms: GlossaryItem[];
  isEditMode?: boolean;
}

export default function Entry({
  title,
  summary,
  editorialAuthor,
  editorialDateLabel,
  indexUrl,
  body,
  definitionTitle,
  comparisonTitle,
  comparison,
  example,
  exampleTitle,
  faq,
  resources,
  resourceDisplayCount,
  relatedTerms,
  isEditMode,
}: EntryViewProps) {
  const { t } = useTranslation();
  // The server ranks direct matches before related matches, regardless of resource kind.
  const cta = resources[0];
  const visibleCount = resourceDisplayCount === "3" ? 3 : resourceDisplayCount === "9" ? 9 : 6;
  const definition = splitDefinition(body || "");
  return (
    <article className={classes.entry} data-theme="day">
      <div className={classes.inner}>
        <div className={classes.reading}>
          <div className={classes.body}>
            <header className={classes.heading}>
              <h1>{title}</h1>
              {definition.lead ? (
                <p
                  className={classes.summary}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(definition.lead) }}
                />
              ) : (
                <p className={classes.summary}>{summary}</p>
              )}
            </header>
            {definition.body.trim() && (
              <section aria-labelledby="definition">
                <h2 id="definition" tabIndex={-1}>
                  {definitionTitle || t("glossary.definitionTitle")}
                </h2>
                <div
                  className="_richtext"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(definition.body) }}
                />
              </section>
            )}
            {comparison ? (
              <section className={classes.comparison} aria-labelledby="distinction">
                <h2 id="distinction" tabIndex={-1}>
                  {comparisonTitle || t("glossary.distinction")}
                </h2>
                <div
                  className="_richtext"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(comparison) }}
                />
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
                  <div
                    className="_richtext"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(example) }}
                  />
                </div>
              </section>
            )}
            {faq && (
              <section className={classes.faq} aria-labelledby="faq">
                <h2 id="faq" tabIndex={-1}>
                  {t("glossary.faq")}
                </h2>
                <div
                  className="_richtext"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(faq) }}
                />
              </section>
            )}
          </div>
        </div>
        <div className={classes.followUp}>
          {resources.length > 0 ? (
            <section className={classes.resources} aria-labelledby="resources">
              <div className={classes.sectionHeading}>
                <h2 id="resources" tabIndex={-1}>
                  {t("glossary.resourcesTitle", {
                    term: title,
                    interpolation: { escapeValue: false },
                  })}
                </h2>
              </div>
              <ul className={classes.resourceGrid}>
                {resources.slice(0, visibleCount).map((resource) => (
                  <li key={resource.id}>
                    <a href={resource.url} className={classes.resourceCard}>
                      <span className={classes.resourceKind}>
                        {t(`glossary.kinds.${resource.kind}`)}
                      </span>
                      <p className={classes.resourceTitle}>{resource.title}</p>
                    </a>
                  </li>
                ))}
              </ul>
              {resources.length > visibleCount && (
                <details className={classes.moreResources}>
                  <summary>{t("glossary.showAllResources", { count: resources.length })}</summary>
                  <ul className={classes.resourceGrid}>
                    {resources.slice(visibleCount).map((resource) => (
                      <li key={resource.id}>
                        <a href={resource.url} className={classes.resourceCard}>
                          <span className={classes.resourceKind}>
                            {t(`glossary.kinds.${resource.kind}`)}
                          </span>
                          <p className={classes.resourceTitle}>{resource.title}</p>
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
          {(cta || relatedTerms.length > 0) && (
            <section className={classes.cta} data-theme="night" aria-labelledby="topic-cta">
              <h2 id="topic-cta">{t("glossary.explore")}</h2>
              {cta && (
                <>
                  <p>{cta.title}</p>
                  <CTA href={cta.url} location="glossary" name="topic-resource">
                    {t("glossary.readResource")}
                  </CTA>
                </>
              )}
              {relatedTerms.length > 0 && (
                <ul className={classes.relatedList}>
                  {relatedTerms.map((term) => (
                    <li key={term.id}>
                      <CTA href={term.url} location="glossary" name="related-term">
                        {term.title}
                      </CTA>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          <footer className={classes.editorialFooter}>
            <div>
              {editorialAuthor && (
                <p>
                  {t("glossary.author")} : {editorialAuthor}
                </p>
              )}
              {editorialDateLabel && (
                <p>
                  {t("glossary.editorialDate")} : {editorialDateLabel}
                </p>
              )}
            </div>
            {indexUrl && <a href={indexUrl}>{t("glossary.backToGlossary")}</a>}
          </footer>
        </div>
      </div>
    </article>
  );
}
