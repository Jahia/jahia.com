import { loadSuggestions, type EntryResource, type SuggestionLink } from "./deferredSuggestions.js";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Carousel from "../../views/ResourceCarousel/Carousel.client.jsx";
import { CTA } from "../../mixins/CTA/index.jsx";
import ctaClasses from "../../mixins/CTA/component.module.css";
import classes from "./component.module.css";

export default function DeferredSuggestions({ endpoint }: { endpoint: string }) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"waiting" | "loading" | "done" | "error">("waiting");
  const [resources, setResources] = useState<EntryResource[]>([]);
  const [terms, setTerms] = useState<SuggestionLink[]>([]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let started = false;
    let disposed = false;
    const load = async () => {
      if (started) return;
      started = true;
      setState("loading");
      timer = setTimeout(() => controller.abort(), 25000);
      try {
        const rows = await loadSuggestions(endpoint, controller.signal);
        if (!controller.signal.aborted) {
          setResources(rows.resources);
          setTerms(rows.terms);
          setState("done");
        }
      } catch {
        if (!disposed) setState("error");
      } finally {
        clearTimeout(timer);
      }
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                observer?.disconnect();
                void load();
              }
            },
            { rootMargin: "300px" },
          );
    if (observer) observer.observe(element);
    else void load();
    return () => {
      disposed = true;
      observer?.disconnect();
      controller.abort();
      clearTimeout(timer);
    };
  }, [endpoint, attempt]);
  useEffect(() => {
    if (state === "done" && attempt > 0)
      root.current?.querySelector<HTMLElement>("#resources")?.focus();
  }, [state, attempt]);
  return (
    <div
      ref={root}
      className={`${classes.followUp} ${classes.deferredResources}`}
      data-deferred-resources={state}
      aria-busy={state === "loading"}
    >
      <section className={classes.resources} aria-labelledby="resources">
        <h2 id="resources" tabIndex={-1}>
          {t("glossary.resourcesTitle")}
        </h2>
        {state !== "done" && state !== "error" && (
          <p role="status">{t("glossary.suggestionsLoading")}</p>
        )}
        {state === "error" && (
          <p role="status">
            {t("glossary.suggestionsError")}{" "}
            <button
              type="button"
              className={ctaClasses.cta}
              data-variant="secondary"
              onClick={() => {
                setState("waiting");
                setAttempt((value) => value + 1);
              }}
            >
              {t("glossary.suggestionsRetry")}
            </button>
          </p>
        )}
        {state === "done" && resources.length === 0 && <p>{t("glossary.resourcesEmpty")}</p>}
        {resources.length > 0 && (
          <Carousel itemCount={resources.length} labelledBy="resources" fitItems showArrows={false}>
            {resources.map((resource) => (
              <article key={resource.id} className={classes.resourceItem} data-carousel-item="">
                <div className={classes.resourceCard}>
                  <span className={classes.resourceKind}>
                    {t(`glossary.kinds.${resource.kind}`)}
                  </span>
                  <p className={classes.resourceTitle}>{resource.title}</p>
                  <CTA
                    secondary
                    href={resource.url}
                    location="glossary"
                    name="resource-detail"
                    aria-label={`${t("glossary.readResource")} : ${resource.title}`}
                  >
                    {t("glossary.readResource")}
                  </CTA>
                </div>
              </article>
            ))}
          </Carousel>
        )}
      </section>
      {state === "done" && (resources[0] || terms.length > 0) && (
        <section className={classes.cta} data-theme="night" aria-labelledby="topic-cta">
          <h2 id="topic-cta">{t("glossary.explore")}</h2>
          {resources[0] && (
            <>
              <p>{resources[0].title}</p>
              <CTA href={resources[0].url} location="glossary" name="topic-resource">
                {t("glossary.readResource")}
              </CTA>
            </>
          )}
          {terms.length > 0 && (
            <ul className={classes.relatedList}>
              {terms.map((term) => (
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
      <noscript>{t("glossary.suggestionsNoScript")}</noscript>
    </div>
  );
}
