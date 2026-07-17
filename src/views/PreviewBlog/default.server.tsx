import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Image } from "../../components/Image.jsx";
import classes from "./styles.module.css";

type BlogEntryProps = {
  "jcr:title"?: string;
  "jcr:description"?: string;
  author?: JCRNodeWrapper;
  summary?: string;
  date?: string;
  blogType?: Array<JCRNodeWrapper | null>;
  image?: JCRNodeWrapper;
};

type ViewContext = {
  currentNode: JCRNodeWrapper;
  currentResource?: {
    getLocale: () => { toString: () => string };
  };
};

const getNodeDisplayName = (node?: JCRNodeWrapper) => {
  if (!node) return "";

  try {
    return node.getPropertyAsString("name") || node.getDisplayableName();
  } catch {
    try {
      return node.getDisplayableName();
    } catch {
      return "";
    }
  }
};

const getFirstBlogType = (blogType?: Array<JCRNodeWrapper | null>) => {
  const firstType = blogType?.find(Boolean);
  return firstType?.getDisplayableName() || "Blog";
};

const formatDate = (date?: string, locale?: string) => {
  if (!date) return "";

  try {
    return new Date(date).toLocaleDateString(locale || undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
};

const PreviewBlogCard = (
  { "jcr:title": title, "jcr:description": description, author, date, image, summary, blogType }: BlogEntryProps,
  { currentNode, currentResource }: ViewContext,
) => {
  const articleUrl = buildNodeUrl(currentNode);
  const safeTitle = title || currentNode.getDisplayableName() || "Article";
  const locale = currentResource?.getLocale().toString();
  const authorName = getNodeDisplayName(author);
  const excerpt = summary || description;

  return (
    <article className={classes.standardCard}>
      <a
        className={classes.cardLink}
        href={articleUrl}
        data-element-url={articleUrl}
        data-element-type="link"
        data-element-text={safeTitle}
        data-element-location="blog_section"
        data-element-name={currentNode.getName()}
      >
        <div className={clsx(classes.cardImageWrapper, "hideWhenSmall")}>
          {image && <Image image={image} />}
          <span className={classes.cardBadge}>{getFirstBlogType(blogType)}</span>
        </div>

        <div className={classes.cardContent}>
          {(date || authorName) && (
            <div className={classes.cardMeta}>
              {date && <time dateTime={date}>{formatDate(date, locale)}</time>}
              {authorName && <span>{authorName}</span>}
            </div>
          )}

          <h3 className={classes.cardTitle}>{safeTitle}</h3>
          {excerpt && <p className={classes.cardSummary}>{excerpt}</p>}
        </div>
      </a>
    </article>
  );
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
    name: "previewBlog",
    displayName: "PreviewBlog",
  },
  PreviewBlogCard,
);
