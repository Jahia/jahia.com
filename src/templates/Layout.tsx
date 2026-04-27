import {
  AbsoluteArea,
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
  "htmlTitle"?: string;
  "jsonLd"?: string[];
  "stylesheets"?: Array<JCRNodeWrapper | null>;
  "j:tagList"?: string[];
  "j:defaultCategory"?: Array<JCRNodeWrapper | null>;
  "pageType"?: string;
  "j:lastPublished"?: string;
  "jcr:created"?: string;
  "jcr:lastModified"?: string;
}

/** Places `children` in an html page. */
export const Layout = ({
  props,
  children,
  pageType,
}: {
  props: Props;
  children: ReactNode;
  pageType?: string;
}) => {
  const { currentResource, renderContext, mainNode } = useServerContext();
  const lang = currentResource.getLocale().getLanguage();

  const {
    "jcr:title": title,
    "htmlTitle": htmlTitle,
    "jcr:description": description,
    "seoKeywords": keywords,
    "openGraphImage": openGraphImage,
    "jsonLd": jsonLd,
    "stylesheets": stylesheets,
  } = props;

  return (
    <html lang={lang}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{htmlTitle || title}</title>
        <meta property="og:title" content={htmlTitle || title} />
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
        <AddResources type="css" resources={buildModuleFileUrl("dist/assets/style.css")} />
        {stylesheets
          ?.filter((stylesheet) => stylesheet !== null)
          .map((stylesheet) => (
            <style key={stylesheet.getIdentifier()}>{stylesheet.getPropertyAsString("css")}</style>
          ))}
        {jsonLd?.map((content) => (
          <script type="application/ld+json" key={content}>
            {content}
          </script>
        ))}
      </head>
      <body>
        <script>{
          /* Because WEM does not support registering callbacks before the lib is loaded, we place this here */
          `window.digitalDataOverrides?.push(${JSON.stringify({
            wemInitConfig: { requiredProfileProperties: ["hubspot_visitor_type"] },
          })});window.wem?._registerCallback(()=>{window.dataLayer.push({user_id:cxs.profileId,visitor_type:cxs.profileProperties?.hubspot_visitor_type,...${JSON.stringify(
            {
              event: "user_data_ready", // Tell GTM we're ready for what's next
              page_type: pageType ?? props.pageType,
              page_tags: props["j:tagList"],
              cluster_name: props["j:defaultCategory"]?.map((category) =>
                category?.getPath().slice("/sites/systemsite/categories/".length),
              ),
              content_language: currentResource.getLocale().toString(),
              publish_date /* [sic] */: props["j:lastPublished"],
              creation_date: props["jcr:created"],
              last_modified_date: props["jcr:lastModified"],
            },
          )}})})`
        }</script>
        <EditorHints
          title={"Page SEO checklist:"}
          hints={() => ({
            "Title": htmlTitle || title,
            "Description": description,
            "Keywords": keywords?.join(", "),
            "OpenGraph image":
              openGraphImage &&
              `${openGraphImage.getPropertyAsString("jcr:title")} (${openGraphImage.getPropertyAsString("j:width")}x${openGraphImage.getPropertyAsString("j:height")}, ${prettyBytes(openGraphImage.getNode("jcr:content").getProperty("jcr:data").getLength())})`,
            "JSON-LD": jsonLd?.length,
          })}
        />
        <NavBar
          site={renderContext.getSite()}
          root={renderContext.getSite().getHome()}
          current={mainNode}
        />
        {children}
        <AbsoluteArea
          parent={renderContext.getSite()}
          name="footer"
          nodeType="jahiacom:pageFooter"
        />
      </body>
    </html>
  );
};
