import {
  buildNodeUrl,
  jahiaComponent,
  Render,
  useJCRQuery,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Image } from "../../components/Image.jsx";
import { Layout } from "../../templates/Layout.jsx";
import classes from "./styles.module.css";

type BlogEntryProps = {
  "jcr:title"?: string;
  "jcr:description"?: string;
  author?: JCRNodeWrapper;
  summary?: string;
  date?: string;
  blogType?: Array<JCRNodeWrapper | null>;
  image?: JCRNodeWrapper;
  text?: string;
  seoKeywords?: string[];
};

type FullPageContext = {
  currentNode: JCRNodeWrapper;
  currentResource: {
    getLocale: () => {
      getLanguage: () => string;
      toString: () => string;
    };
  };
};

type TocEntry = {
  id: string;
  label: string;
};

const LATEST_ARTICLES_LIMIT = 3;

/**
 * Laisser vide pour utiliser le dossier parent de l'article courant.
 * Si besoin, renseigner ici le chemin JCR du dossier blog, par exemple :
 * "/sites/JAHIA.COM/contents/blog" ou "/sites/JAHIA.COM/home/blog".
 */
const BLOG_ROOT_PATH = "";

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "").trim();

const slugify = (value: string) =>
  stripHtml(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

const createToc = (text: string) => {
  const headings: TocEntry[] = [];
  const usedIds = new Set<string>();

  const body = text.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (match, attrs: string, label: string) => {
    const existingId = attrs.match(/id=["']([^"']*)["']/i)?.[1];
    const baseId = existingId || slugify(label);
    let id = baseId;
    let index = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${index}`;
      index += 1;
    }

    usedIds.add(id);
    headings.push({ id, label });

    if (existingId) return match;
    return `<h2${attrs} id="${id}">${label}</h2>`;
  });

  return { body, headings };
};

const getNodeIdentity = (node: JCRNodeWrapper) => {
  try {
    return node.getIdentifier();
  } catch {
    return node.getPath();
  }
};

const getLatestArticlesRootPath = (currentNode: JCRNodeWrapper) => {
  if (BLOG_ROOT_PATH) return BLOG_ROOT_PATH;

  try {
    return currentNode.getParent().getPath();
  } catch {
    return currentNode.getPath();
  }
};

const formatDate = (date?: string, locale?: string) => {
  if (!date) return "";

  try {
    return new Date(date).toLocaleDateString(locale || undefined);
  } catch {
    return date;
  }
};

const LatestArticles = ({ currentNode }: { currentNode: JCRNodeWrapper }) => {
  const latestArticles = useJCRQuery({
    query: `
      SELECT * FROM [jahiacom:blogEntry]
      WHERE ISDESCENDANTNODE(${JSON.stringify(getLatestArticlesRootPath(currentNode))})
      ORDER BY [date] DESC
    `,
  })
    .filter((entry) => getNodeIdentity(entry) !== getNodeIdentity(currentNode))
    .slice(0, LATEST_ARTICLES_LIMIT);

  if (latestArticles.length === 0) return null;

  return (
    <section className={classes.latestArticles} aria-labelledby="latest-articles-title">
      <div className={classes.latestArticlesHeader}>
        <p className={classes.eyebrow}>Blog</p>
        <h2 id="latest-articles-title">Derniers articles</h2>
        <p>Continuez votre lecture avec les derniers contenus mis en ligne.</p>
      </div>

      <div className={classes.latestArticlesGrid}>
        {latestArticles.map((article) => (
          <Render key={getNodeIdentity(article)} node={article} view="previewBlog" />
        ))}
      </div>
    </section>
  );
};

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jahiacom:blogEntry",
  },
  (props, { currentNode }) => (
    <Layout props={props} pageType="blog_post">
      <Render node={currentNode} view="fullPage" />
    </Layout>
  ),
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
    name: "fullPage",
  },
  (
    {
      "jcr:title": title,
      "jcr:description": description,
      author,
      blogType,
      date,
      text,
      image,
      summary,
      seoKeywords,
    }: BlogEntryProps,
    { currentNode, currentResource }: FullPageContext,
  ) => {
    const { body, headings } = createToc(text || "");
    const locale = currentResource.getLocale().toString();
    const safeTitle = title || currentNode.getDisplayableName();

    return (
      <article className={classes.article}>
        <div className={classes.articleCover}>{image && <Image image={image} />}</div>

        <header className={classes.articleHeader}>
          <p className={classes.eyebrow}>Blog</p>
          <h1>{safeTitle}</h1>

          <div className={classes.articleInfo}>
            <div className={classes.blogType}>
              {blogType?.map((bt, i) =>
                bt ? <span key={`${getNodeIdentity(bt)}-${i}`}>{bt.getDisplayableName()}</span> : null,
              )}
            </div>

            <p className={classes.byline}>
              {author && <span>{author.getDisplayableName()}</span>}
              {date && <time dateTime={date}>{formatDate(date, locale)}</time>}
            </p>
          </div>
        </header>

        {headings.length > 0 && (
          <nav className={classes.index} aria-label="Sommaire de l'article">
            <strong>Dans cet article</strong>
            <ul>
              {headings.map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`} dangerouslySetInnerHTML={{ __html: heading.label }} />
                </li>
              ))}
            </ul>
          </nav>
        )}

        {body && <div className={classes.richtext} dangerouslySetInnerHTML={{ __html: body }} />}

        {author && (
          <footer className={classes.authorFooter}>
            <Render node={author} />
          </footer>
        )}

        <LatestArticles currentNode={currentNode} />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "BlogPosting",
            "@id": `https://www.jahia.com${buildNodeUrl(currentNode)}`,
            "headline": safeTitle,
            "name": safeTitle,
            "description": summary || description,
            "datePublished": date,
            "dateModified": date,
            "author": author && {
              "@type": "Person",
              "@id": `https://www.jahia.com${buildNodeUrl(author)}`,
              "name": author.getPropertyAsString("name"),
              "url": `https://www.jahia.com${buildNodeUrl(author)}`,
            },
            "publisher": {
              "@type": "Organization",
              "@id": "https://www.jahia.com",
              "name": "Jahia",
            },
            "image": image && {
              "@type": "ImageObject",
              "@id": `https://www.jahia.com${buildNodeUrl(image)}`,
              "url": `https://www.jahia.com${buildNodeUrl(image)}`,
            },
            "url": `https://www.jahia.com${buildNodeUrl(currentNode)}`,
            "isPartOf": {
              "@type": "Blog",
              "@id": "https://www.jahia.com/blog/",
              "name": "Jahia Blog",
              "url": "https://www.jahia.com/blog/",
              "publisher": {
                "@type": "Organization",
                "@id": "https://www.jahia.com",
                "name": "Jahia",
              },
            },
            "keywords": seoKeywords,
            "inLanguage": currentResource.getLocale().getLanguage(),
          })}
        </script>
      </article>
    );
  },
);
