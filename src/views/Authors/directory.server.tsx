import {
  buildNodeUrl,
  Island,
  jahiaComponent,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import type { ContainerProps } from "../../theme/index.jsx";
import Carousel from "../ResourceCarousel/Carousel.client.jsx";
import section from "../Section/component.module.css";
import { AuthorCard } from "./AuthorCard.jsx";
import { useAuthorReader } from "./data.server.js";
import { directoryPageNumber } from "./queries.js";
import classes from "./component.module.css";

interface Props extends ContainerProps {
  "jcr:title"?: string;
  "subtitle"?: string;
  "authors"?: Array<JCRNodeWrapper | null>;
  "sourceFolder"?: JCRNodeWrapper;
  "presentation"?: "grid" | "carousel";
  "excludedAuthor"?: string;
}

export function AuthorDirectory({
  "jcr:title": title,
  subtitle,
  "authors": configured = [],
  sourceFolder,
  presentation = "grid",
  excludedAuthor,
  theme = "cloudy",
  background,
}: Props) {
  const { currentNode, mainNode, renderContext } = useServerContext();
  const { t } = useTranslation();
  const { available, authors: readAuthors } = useAuthorReader();
  const automaticSource = configured.some(Boolean) ? undefined : sourceFolder;
  const page =
    automaticSource && presentation === "grid"
      ? directoryPageNumber(renderContext.getRequest().getParameter("authorsPage"))
      : 0;
  const limit = presentation === "grid" ? 30 : 6;
  const candidates = automaticSource
    ? readAuthors(automaticSource, limit + 1, page * limit, excludedAuthor)
    : configured;
  const hasNext = candidates.length > limit;
  const seen = new Set<string>();
  const selected = candidates
    .slice(0, automaticSource ? limit : 60)
    .filter((author): author is JCRNodeWrapper => {
      if (
        !available(author) ||
        !author.isNodeType("jahiacom:blogAuthor") ||
        author.getIdentifier() === excludedAuthor ||
        seen.has(author.getIdentifier())
      )
        return false;
      seen.add(author.getIdentifier());
      return true;
    });
  if (!selected.length && !renderContext.isEditMode() && presentation === "carousel") return null;
  const headingId = "authors-" + currentNode.getIdentifier();
  const cards = selected.map((author) => (
    <div key={author.getIdentifier()} data-carousel-item="">
      <AuthorCard author={author} />
    </div>
  ));
  return (
    <section
      className={classes.directory}
      data-theme={theme}
      data-bg={background}
      aria-labelledby={title ? headingId : undefined}
    >
      {(title || subtitle) && (
        <header className={classes.heading}>
          {title && <h2 id={headingId}>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </header>
      )}
      <div className={section.wrapper}>
        {presentation === "carousel" && selected.length && !renderContext.isEditMode() ? (
          <Island
            component={Carousel}
            props={{ itemCount: selected.length, labelledBy: title ? headingId : undefined }}
          >
            {cards}
          </Island>
        ) : (
          <div className={classes.grid}>{cards}</div>
        )}
      </div>
      {automaticSource && presentation === "grid" && (page > 0 || hasNext) && (
        <nav className={classes.paging} aria-label={t("authors.pagination")}>
          {page > 0 && (
            <a href={buildNodeUrl(mainNode, { parameters: { authorsPage: String(page - 1) } })}>
              {t("authors.previous")}
            </a>
          )}
          {hasNext && (
            <a href={buildNodeUrl(mainNode, { parameters: { authorsPage: String(page + 1) } })}>
              {t("authors.next")}
            </a>
          )}
        </nav>
      )}
    </section>
  );
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:authorDirectory",
    properties: { "cache.requestParameters": "authorsPage" },
  },
  (props: Props) => <AuthorDirectory {...props} />,
);
