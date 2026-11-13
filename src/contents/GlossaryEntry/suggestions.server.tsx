import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jahiacom:glossaryEntry",
    name: "suggestions",
    properties: { "cache.perUser": "true", "cache.expiration": "300" },
  },
  (_props, { renderContext }) => {
    const response = renderContext.getResponse() as unknown as {
      setHeader(name: string, value: string): void;
    };
    response.setHeader("X-Robots-Tag", "noindex");
    // Old pages may still request this URL until their HTML cache expires.
    return (
      <html>
        <head>
          <meta name="robots" content="noindex" />
        </head>
        <body>
          <div data-glossary-resources='{"resources":[],"terms":[]}' />
        </body>
      </html>
    );
  },
);
