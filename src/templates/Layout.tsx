import {
  AddResources,
  buildModuleFileUrl,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import prettyBytes from "pretty-bytes";
import type { ReactNode } from "react";
import EditorHints from "../components/EditorHints.jsx";

import "modern-normalize/modern-normalize.css";
import "virtual:uno.css";
import "./global.css";
import "./themes.css";

/** Only used in editor hint. */
const extractJsonLdType = (jsonLd: string) => {
  try {
    const parsedJsonLd = JSON.parse(jsonLd);
    return parsedJsonLd["@type"] ? `@type ${parsedJsonLd["@type"]}` : "No @type";
  } catch {
    return false;
  }
};

/** Places `children` in an html page. */
export const Layout = ({
  title,
  description,
  keywords,
  openGraphImage,
  jsonLd,
  children,
}: {
  title: string;
  description?: string;
  keywords?: string[];
  openGraphImage?: JCRNodeWrapper;
  jsonLd?: string;
  children: ReactNode;
}) => {
  const { currentResource, renderContext } = useServerContext();
  const lang = currentResource.getLocale().getLanguage();
  return (
    <html lang={lang}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta property="og:title" content={title} />
        {description && (
          <>
            <meta name="description" content={description} />
            <meta property="og:description" content={description} />
          </>
        )}
        {keywords && keywords.length > 0 && <meta name="keywords" content={keywords?.join(", ")} />}
        {openGraphImage && (
          <>
            <meta
              property="og:image"
              content={openGraphImage.getAbsoluteUrl(renderContext.getRequest())}
            />
            {openGraphImage.hasProperty("jcr:title") && (
              <meta
                property="og:image:alt"
                content={openGraphImage.getPropertyAsString("jcr:title")}
              />
            )}
            {openGraphImage.hasProperty("j:width") && (
              <meta
                property="og:image:width"
                content={openGraphImage.getPropertyAsString("j:width")}
              />
            )}
            {openGraphImage.hasProperty("j:height") && (
              <meta
                property="og:image:height"
                content={openGraphImage.getPropertyAsString("j:height")}
              />
            )}
          </>
        )}
        {jsonLd && <script type="application/ld+json">{jsonLd}</script>}
        <AddResources type="css" resources={buildModuleFileUrl("dist/server/index.css")} />
      </head>
      <body>
        <EditorHints
          title={"Page SEO checklist:"}
          hints={() => ({
            "Title": title,
            "Description": description,
            "Keywords": keywords?.join(", "),
            "OpenGraph image":
              openGraphImage &&
              `${openGraphImage.getPropertyAsString("jcr:title") ?? "No title"} (${openGraphImage.getPropertyAsString("j:width")}x${openGraphImage.getPropertyAsString("j:height")}, ${prettyBytes(openGraphImage.getNode("jcr:content").getProperty("jcr:data").getLength())})`,
            "JSON-LD": jsonLd && extractJsonLdType(jsonLd),
          })}
        />
        {children}
      </body>
    </html>
  );
};
