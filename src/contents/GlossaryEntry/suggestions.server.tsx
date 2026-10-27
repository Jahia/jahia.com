import { jahiaComponent, server } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import { automaticLinks } from "./automaticLinks.server.js";

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jahiacom:glossaryEntry",
    name: "suggestions",
    properties: { "cache.perUser": "true", "cache.expiration": "300" },
  },
  (props: Props, { renderContext }) => {
    const response = renderContext.getResponse() as unknown as {
      setHeader(name: string, value: string): void;
    };
    response.setHeader("X-Robots-Tag", "noindex");
    const sitePath = renderContext
      .getSite()
      .getPath()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    server.render.addCacheDependency(
      { flushOnPathMatchingRegexp: `^${sitePath}(?:/.*)?$` },
      renderContext,
    );
    // A merged entry must not expose recommendations through its alternate template.
    const count =
      props.resourceDisplayCount === "3" ? 3 : props.resourceDisplayCount === "9" ? 9 : 6;
    const automatic = props.mergedInto
      ? { resources: [], terms: [] }
      : automaticLinks(props, [], count);
    const resources = automatic.resources.slice(0, count);
    return (
      <html>
        <head>
          <meta name="robots" content="noindex" />
        </head>
        <body>
          <div
            data-glossary-resources={JSON.stringify({
              resources: resources.map(({ id, title, url, kind }) => ({ id, title, url, kind })),
              terms: automatic.terms.map(({ id, title, url }) => ({ id, title, url })),
            })}
          />
        </body>
      </html>
    );
  },
);
