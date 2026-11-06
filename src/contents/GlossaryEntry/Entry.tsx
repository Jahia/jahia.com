import Accordion from "../../views/Accordion/Accordion.client.jsx";
import Collapsible from "../../views/Card/Collapsible.jsx";
import { Island } from "@jahia/javascript-modules-library";
import type { FaqItem } from "./faqItems.js";
import { faqBlocks } from "./faqBlocks.js";
import ManualResources from "./ManualResources.jsx";
import type { EntryResource } from "./deferredSuggestions.js";
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
  faqItems?: FaqItem[];
  comparisonTitle?: string;
  comparison?: string;
  indexUrl?: string;
  isEditMode?: boolean;
  resourceEndpoint?: string;
  resources?: EntryResource[];
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
  faqItems = [],
  isEditMode,
  resourceEndpoint,
  resources = [],
}: EntryViewProps) {
  const { t } = useTranslation();
  const definition = splitDefinition(body || "");
  const blocks = faqItems.length ? faqItems : faqBlocks(sanitizeHtml(faq || ""));
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
            {blocks.length > 0 && (
              <section className={classes.faq} aria-labelledby="faq">
                <h2 id="faq" tabIndex={-1}>
                  {t("glossary.faq")}
                </h2>
                <Island component={Accordion}>
                  {blocks.map((block) =>
                    block.question ? (
                      <Collapsible
                        key={block.key}
                        id={`glossary-faq-${block.key}`}
                        title={block.question}
                        expanded={isEditMode}
                      >
                        <div
                          className="_richtext"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
                        />
                      </Collapsible>
                    ) : (
                      <div
                        key={block.key}
                        className="_richtext"
                        dangerouslySetInnerHTML={{ __html: block.html }}
                      />
                    ),
                  )}
                </Island>
              </section>
            )}
          </div>
        </div>
        <div className={classes.followUp}>
          <ManualResources resources={resources} />
          {resources.length === 0 && resourceEndpoint && (
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
