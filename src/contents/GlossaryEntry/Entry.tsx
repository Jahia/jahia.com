import { Island } from "@jahia/javascript-modules-library";
import DeferredSuggestions from "./DeferredSuggestions.client.jsx";
import { useTranslation } from "react-i18next";
import { CTA } from "../../mixins/CTA/index.jsx";
import { splitDefinition } from "./inlineTerms.js";
import { sanitizeHtml } from "./sanitizeHtml.js";
import classes from "./component.module.css";

export interface EntryViewProps {
  title: string;
  summary: string;
  editorialDateLabel?: string;
  body?: string;
  definitionTitle?: string;
  exampleTitle?: string;
  example?: string;
  faq?: string;
  comparisonTitle?: string;
  comparison?: string;
  indexUrl?: string;
  isEditMode?: boolean;
  resourceEndpoint?: string;
}

export default function Entry({
  title,
  summary,
  editorialDateLabel,
  indexUrl,
  body,
  definitionTitle,
  comparisonTitle,
  comparison,
  example,
  exampleTitle,
  faq,
  isEditMode,
  resourceEndpoint,
}: EntryViewProps) {
  const { t } = useTranslation();
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
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(definition.lead),
                  }}
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
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(definition.body),
                  }}
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
          {resourceEndpoint && (
            <Island component={DeferredSuggestions} props={{ endpoint: resourceEndpoint }} />
          )}
          <footer className={classes.editorialFooter}>
            <div>
              {editorialDateLabel && (
                <p>
                  {t("glossary.editorialDate")} : {editorialDateLabel}
                </p>
              )}
            </div>
            {indexUrl && (
              <CTA secondary href={indexUrl} location="glossary" name="back-to-glossary">
                {t("glossary.backToGlossary")}
              </CTA>
            )}
          </footer>
        </div>
      </div>
    </article>
  );
}
