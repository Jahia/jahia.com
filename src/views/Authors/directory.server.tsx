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
import {
  readAuthorTopicSelection,
  suggestAuthorTopics,
  usePublishedTopicsByAuthor,
} from "./topics.server.js";
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
  const { available, authors: readAuthors, cache } = useAuthorReader();
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
  const headingId = "authors-" + currentNode.getIdentifier();
  const sitePath = renderContext.getSite().getPath();
  const selections = selected.map((author) => ({
    author,
    id: author.getIdentifier(),
    topics: readAuthorTopicSelection(author, sitePath, cache),
  }));
  const counts = usePublishedTopicsByAuthor(
    selections.filter(({ topics }) => !topics.length).map(({ id }) => id),
  );
  if (!selected.length && !renderContext.isEditMode() && presentation === "carousel") return null;
  const cards = selections.map(({ author, id, topics }) => {
    const cardTopics = topics.length ? topics : suggestAuthorTopics(counts.get(id) ?? [], sitePath);
    return (
      <div key={id} data-carousel-item="">
        <AuthorCard author={author} topics={cardTopics.slice(0, 3)} />
      </div>
    );
  });
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
