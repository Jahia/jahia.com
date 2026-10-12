import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { Image } from "../../../components/Image.jsx";
import { publicBlogImage } from "./publicImages.js";
import type { Props } from "./types.js";
import { contentCategories } from "../../../utils/contentCategories.js";
import classes from "./styles.module.css";
import BlogDate from "./BlogDate.jsx";

export const BlogCard = ({
  props: {
    "jcr:title": title,
    "jcr:description": description,
    "jcr:lastModified": lastModified,
    author,
    date,
    image,
    "j:defaultCategory": categories,
    summary,
    useLastModifiedDate,
  },
  currentNode,
  locale,
  featured = false,
  featuredLead = false,
}: {
  props: Props;
  currentNode: JCRNodeWrapper;
  locale: string;
  featured?: boolean;
  featuredLead?: boolean;
}) => {
  const { t } = useTranslation();
  const url = buildNodeUrl(currentNode);
  const fallbackImage = image ? undefined : publicBlogImage(title, featured);
  const assignedCategories = categories?.some(Boolean)
    ? categories.filter((category): category is JCRNodeWrapper => category !== null)
    : contentCategories(currentNode);
  // Technical classification remains available to filters, but is not a public badge.
  const displayedCategories = assignedCategories.filter(
    (category) =>
      !/\/categories\/(pageTypes|resourcestypes|blogTypes)(\/|$)/.test(category.getPath()),
  );

  return (
    <article
      className={clsx(
        classes.item,
        featured && classes.featured,
        featuredLead && classes.featuredLead,
      )}
    >
      <div className={classes.cover}>
        {image && <Image image={image} sizes={featuredLead ? [720, 1440] : [360, 720]} />}
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
          <BlogDate
            date={date}
            lastModified={lastModified}
            useLastModifiedDate={useLastModifiedDate}
            locale={locale}
          />
        </div>

        {(summary || description) && <p className={classes.summary}>{summary || description}</p>}
        {displayedCategories.length > 0 && (
          <div className={classes.categories} aria-label={t("blogListing.categories")}>
            {displayedCategories.map((category) => (
              <span key={category.getIdentifier()}>{category.getDisplayableName()}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
  },
  (props: Props, { currentNode, currentResource }) => {
    return (
      <BlogCard
        props={props}
        currentNode={currentNode}
        locale={currentResource.getLocale().getLanguage()}
      />
    );
  },
);
