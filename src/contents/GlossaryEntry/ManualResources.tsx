import { Island } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import Carousel from "../../views/ResourceCarousel/Carousel.client.jsx";
import { CTA } from "../../mixins/CTA/index.jsx";
import type { EntryResource } from "./deferredSuggestions.js";
import classes from "./component.module.css";

export default function ManualResources({ resources }: { resources: EntryResource[] }) {
  const { t } = useTranslation();
  if (!resources.length) return null;
  return (
    <section
      className={classes.resources}
      aria-labelledby="resources"
      data-glossary-manual-resources=""
    >
      <h2 id="resources" tabIndex={-1}>
        {t("glossary.resourcesTitle")}
      </h2>
      <Island
        component={Carousel}
        props={{ itemCount: resources.length, labelledBy: "resources", fitItems: true }}
      >
        {resources.map((resource) => (
          <article key={resource.id} className={classes.resourceItem} data-carousel-item="">
            <div className={classes.resourceCard}>
              <span className={classes.resourceKind}>
                {t(`resourceCarousel.types.${resource.kind}`)}
              </span>
              <h3 className={classes.resourceTitle}>{resource.title}</h3>
              {resource.description && <p>{resource.description}</p>}
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
      </Island>
    </section>
  );
}
