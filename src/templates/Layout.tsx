import {
  AddResources,
  buildModuleFileUrl,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import prettyBytes from "pretty-bytes";
import type { ReactNode } from "react";
import EditorHints from "../components/EditorHints.jsx";
import NavBar from "./NavBar.jsx";

import "@fontsource-variable/plus-jakarta-sans/wght";
import "modern-normalize/modern-normalize.css";
import "virtual:uno.css";
import "./global.css";
import "./themes.css";

interface Props {
  "jcr:title": string;
  "jcr:description"?: string;
  "seoKeywords"?: string[];
  "openGraphImage"?: JCRNodeWrapper;
  "jsonLd"?: string[];
  "noindex"?: boolean;
  "nofollow"?: boolean;
}

/** Places `children` in an html page. */
export const Layout = ({ props, children }: { props: Props; children: ReactNode }) => {
  const { currentResource, renderContext, mainNode } = useServerContext();
  const lang = currentResource.getLocale().getLanguage();

  const {
    "jcr:title": title,
    "jcr:description": description,
    "seoKeywords": keywords,
    "openGraphImage": openGraphImage,
    "jsonLd": jsonLd,
    "noindex": noindex,
    "nofollow": nofollow,
  } = props;

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
        {jsonLd?.map((content) => (
          <script type="application/ld+json" key={content}>
            {content}
          </script>
        ))}
        {noindex && <meta name="robots" content="noindex" />}
        {nofollow && <meta name="robots" content="nofollow" />}
        <AddResources type="css" resources={buildModuleFileUrl("dist/assets/style.css")} />
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
            "JSON-LD": jsonLd?.length,
          })}
        />
        <NavBar
          site={renderContext.getSite()}
          root={renderContext.getSite().getHome()}
          current={mainNode}
        />
        {children}
      </body>
    </html>
  );
};
