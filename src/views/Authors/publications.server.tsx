import {
  getNodesByJCRQuery,
  Island,
  Render,
  server,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import Carousel from "../ResourceCarousel/Carousel.client.jsx";
import { Card as ResourceCard } from "../ResourceCarousel/default.server.jsx";
import { toCard } from "../ResourceCarousel/selection.server.js";
import { stringProperty, useAuthorReader } from "./data.server.js";
import { publicationQuery } from "./queries.js";
import classes from "./component.module.css";

export function AuthorPublications({ author }: { author: JCRNodeWrapper }) {
  const { renderContext, currentResource } = useServerContext();
  const { t } = useTranslation();
  const { available, translated, cache } = useAuthorReader();
  cache(author);
  if (author.hasProperty("hidePublications") && author.getProperty("hidePublications").getBoolean())
    return null;
  const customTitle = stringProperty(author, "publicationsTitle");
  const manual: JCRNodeWrapper[] = [];
  if (author.hasProperty("featuredPublications"))
    for (const value of author.getProperty("featuredPublications").getValues()) {
      try {
        const node = value.getNode();
        if (available(node)) manual.push(node);
      } catch {
        /* Deleted weak reference. */
      }
    }
  const site = renderContext.getSite();
  if (!manual.length) server.render.addCacheDependency({ path: site.getPath() }, renderContext);
  const candidates = manual.length
    ? manual.slice(0, 12)
    : getNodesByJCRQuery(
        author.getSession(),
        publicationQuery(site.getPath(), author.getIdentifier()),
        12,
        0,
      );
  const seen = new Set<string>();
  const nodes = candidates.filter((node) => {
    if (!translated(node) || seen.has(node.getIdentifier())) return false;
    if (
      !node.isNodeType("jahiacom:blogEntry") &&
      !node.isNodeType("jahiacom:pressItem") &&
      !node.isNodeType("jnt:page")
    )
      return false;
    const date = node.hasProperty("date") ? Date.parse(node.getPropertyAsString("date")) : 0;
    if (date > Date.now()) return false;
    seen.add(node.getIdentifier());
    return true;
  });
  if (!nodes.length) return null;
  const headingId = "publications-" + author.getIdentifier();
  return (
    <section className={classes.articles} data-theme="day" aria-labelledby={headingId}>
      <header className={classes.heading}>
        <h2 id={headingId}>
          {customTitle ||
            t(manual.length ? "authors.featuredPublications" : "authors.publications")}
        </h2>
      </header>
      <Island component={Carousel} props={{ itemCount: nodes.length, labelledBy: headingId }}>
        {nodes.map((node) => {
          const card = node.isNodeType("jnt:page")
            ? toCard(node, { allowGenericResource: true })
            : undefined;
          return (
            <div className={classes.article} key={node.getIdentifier()} data-carousel-item="">
              {card ? (
                <ResourceCard
                  item={card}
                  typeLabel={t("resourceCarousel.types." + card.kind)}
                  locale={currentResource.getLocale().getLanguage()}
                />
              ) : !node.isNodeType("jnt:page") ? (
                <Render node={node} />
              ) : null}
            </div>
          );
        })}
      </Island>
    </section>
  );
}
