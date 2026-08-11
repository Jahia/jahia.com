import { Area, buildNodeUrl, jahiaComponent, Render } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { Props } from "./types.js";
import classes from "./styles.module.css";
import { Image } from "../../../components/Image.jsx";
import { Layout } from "../../../templates/Layout.jsx";
import { ResourceCarousel } from "../../../views/ResourceCarousel/default.server.jsx";

const hasEditableResourceCarousel = (blogEntry: JCRNodeWrapper) => {
  if (!blogEntry.hasNode("resourceCarousel")) return false;

  const area = blogEntry.getNode("resourceCarousel");
  if (area.isNodeType("jahiacom:resourceCarousel")) return true;

  const children = area.getNodes();
  while (children.hasNext()) {
    if (children.nextNode().isNodeType("jahiacom:resourceCarousel")) return true;
  }

  return false;
};

/** Turn legacy image + credit paragraphs into semantic figures. */
const formatImageCredits = (text: string) =>
  text.replaceAll(
    /<p(?:\s[^>]*)?>\s*(<img\b[^>]*>)\s*<\/p>\s*<p(?:\s[^>]*)?>\s*((?:Image Credit|Crédit(?: de l['’]image| image| photo)?)\s*:[\s\S]*?)\s*<\/p>/gi,
    '<figure class="image image-with-credit">$1<figcaption>$2</figcaption></figure>',
  );

/** Add #anchors to <h2> tags */
const createToc = (text: string) => {
  const headings: Array<{ id: string; label: string }> = [];

  return {
    body: text.replaceAll(/<h2([^>]*)>(.*?)<\/h2>/gi, (match, attrs: string, label: string) => {
      const id =
        attrs.match(/id=["']([^"']*)["']/i)?.[1] ||
        label
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      headings.push({ id, label });
      if (attrs.includes("id=")) return match;
      return `<h2${attrs} id="${id}">${label}</h2>`;
    }),
    headings,
  };
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
    }: Props,
    { currentNode, currentResource, renderContext },
  ) => {
    const { body, headings } = createToc(formatImageCredits(text || ""));
    const hasEditableCarousel = hasEditableResourceCarousel(currentNode);

    return (
      <article className={classes.article}>
        <div className={classes.cover}>{image && <Image image={image} />}</div>

        <header>
          <h1>{title}</h1>
          <div className={classes.info}>
            <div className={classes.blogType}>
              {blogType && blogType.length > 0
                ? blogType.map((bt) =>
                    bt ? <span key={bt.getIdentifier()}>{bt.getDisplayableName()}</span> : null,
                  )
                : null}
            </div>

            <p style={{ fontSize: ".875rem" }} className="_row-3">
              {author && <span>{author.getDisplayableName()}</span>}
              {date && <time dateTime={date}>{new Date(date).toLocaleDateString()}</time>}
            </p>
          </div>
        </header>

        {headings.length > 0 && (
          <div className={classes.indexColumn}>
            <nav className={classes.index}>
              <ul>
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      // Not sure about this, but old posts have accents encoded as HTML entities
                      dangerouslySetInnerHTML={{ __html: heading.label }}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        {body && <div className="_richtext" dangerouslySetInnerHTML={{ __html: body }} />}

        {author && (
          <footer style={{ containerType: "inline-size" }}>
            <Render node={author} />
          </footer>
        )}

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "BlogPosting",
            "@id": `https://www.jahia.com${buildNodeUrl(currentNode)}`,
            "headline": title,
            "name": title,
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
        <div className={classes.resourceCarousel}>
          <Area
            name="resourceCarousel"
            nodeType="jahiacom:blogResourceCarouselArea"
            allowedNodeTypes={["jahiacom:resourceCarousel"]}
            numberOfItems={1}
          />
          {!hasEditableCarousel && !renderContext.isEditMode() && (
            <ResourceCarousel
              itemCount={9}
              minimumItems={1}
              selectionMode="automatic"
              completeFallback
            />
          )}
        </div>
      </article>
    );
  },
);
