import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { Image } from "../../../components/Image.jsx";
import { publicBlogImage } from "./publicImages.js";
import type { Props } from "./types.js";
import classes from "./styles.module.css";

export const BlogCard = ({
  props: {
    "jcr:title": title,
    "jcr:description": description,
    "jcr:lastModified": lastModified,
    author,
    date,
    image,
    summary,
    useLastModifiedDate,
  },
  currentNode,
  locale,
  featured = false,
  listingState,
}: {
  props: Props;
  currentNode: JCRNodeWrapper;
  locale: string;
  featured?: boolean;
  listingState?: { cluster?: string; theme?: string; page?: string };
}) => {
  const { t } = useTranslation();
  const query = [
    listingState?.cluster && `cluster=${encodeURIComponent(listingState.cluster)}`,
    listingState?.theme && `theme=${encodeURIComponent(listingState.theme)}`,
    listingState?.page && `blogPage=${encodeURIComponent(listingState.page)}`,
  ].filter(Boolean);
  const url = `${buildNodeUrl(currentNode)}${query.length > 0 ? `?${query.join("&")}` : ""}`;
  const fallbackImage = image ? undefined : publicBlogImage(title, featured);

  return (
    <article className={clsx(classes.item, featured && classes.featured)}>
      <div className={classes.cover}>
        {image && <Image image={image} sizes={featured ? [720, 1440] : [360, 720]} />}
        {fallbackImage && <img src={fallbackImage} alt="" loading={featured ? "eager" : "lazy"} />}
        {!image && !fallbackImage && (
          <span className={classes.imageFallback} aria-hidden="true">
            Jahia
          </span>
        )}
      </div>
      <div className={classes.cardBody}>
        {featured && <span className={classes.featuredLabel}>{t("blogListing.featured")}</span>}
        <h3>
          <a
            href={url}
            data-element-url={url}
            data-element-type="link"
            data-element-text={title || "no title"}
            data-element-location="blog_section"
            data-element-name={currentNode.getName()}
          >
            {title || "no title"}
          </a>
        </h3>

        <div className={classes.meta}>
          {author && <span>{author.getPropertyAsString("name")}</span>}
          {date && (
            <time dateTime={date}>
              {new Date(date).toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          )}
          {useLastModifiedDate && lastModified && (
            <span>
              {t("blogListing.updatedOn")}{" "}
              {new Date(lastModified).toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {(summary || description) && <p className={classes.summary}>{summary || description}</p>}
        <span className={classes.readMore}>{t("blogListing.readArticle")}</span>
      </div>
    </article>
  );
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
    properties: { "cache.requestParameters": "cluster,theme,blogPage" },
  },
  (props: Props, { currentNode, currentResource, renderContext }) => {
    const request = renderContext.getRequest();

    return (
      <BlogCard
        props={props}
        currentNode={currentNode}
        locale={currentResource.getLocale().getLanguage()}
        listingState={{
          cluster: request.getParameter("cluster") || undefined,
          theme: request.getParameter("theme") || undefined,
          page: request.getParameter("blogPage") || undefined,
        }}
      />
    );
  },
);
