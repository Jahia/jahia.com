import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import classes from "./styles.module.css";
import { Image } from "../../../components/Image.jsx";
import { Render } from "@jahia/javascript-modules-library";

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
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
    name: "fullPage",
  },
  ({ "jcr:title": title, author, blogType, date, text, image }: Props) => {
    const { body, headings } = createToc(text || "");

    return (
      <article className={classes.article}>
        <div className={classes.cover}>{image && <Image image={image} />}</div>

        <header>
          <h1>{title}</h1>
          <div className={classes.info}>
            <div className={classes.blogType}>
              {blogType && blogType.length > 0
                ? blogType.map((bt, i) => (bt ? <Render key={i} node={bt} view="link" /> : null))
                : null}
            </div>

            <p style={{ fontSize: ".875rem" }} className="_row-3">
              {author && <Render node={author} view="link" />}
              {date && <time dateTime={date}>{new Date(date).toLocaleDateString()}</time>}
            </p>
          </div>
        </header>

        {headings.length > 0 && (
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
        )}

        {body && <div className="_richtext" dangerouslySetInnerHTML={{ __html: body }} />}

        {author && (
          <footer>
            <Render node={author} />
          </footer>
        )}
      </article>
    );
  },
);
