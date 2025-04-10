import {
  AddResources,
  buildModuleFileUrl,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ReactNode } from "react";

import "modern-normalize/modern-normalize.css";
import "./global.css";

/** Places `children` in an html page. */
export const Layout = ({
  title,
  description,
  keywords,
  openGraphImage,
  children,
}: {
  title: string;
  description?: string;
  keywords?: string[];
  openGraphImage?: JCRNodeWrapper;
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
        {keywords?.length && <meta name="keywords" content={keywords?.join(", ")} />}
        {openGraphImage && (
          <>
            <meta
              property="og:image"
              content={openGraphImage.getAbsoluteUrl(renderContext.getRequest())}
            />
            {openGraphImage.hasProperty("jcr:title") && (
              <meta
                property="og:image:alt"
                content={openGraphImage.getProperty("jcr:title").getString()}
              />
            )}
            {openGraphImage.hasProperty("j:width") && (
              <meta
                property="og:image:width"
                content={openGraphImage.getProperty("j:width").getString()}
              />
            )}
            {openGraphImage.hasProperty("j:height") && (
              <meta
                property="og:image:height"
                content={openGraphImage.getProperty("j:height").getString()}
              />
            )}
          </>
        )}
        <AddResources type="css" resources={buildModuleFileUrl("dist/server/style.css")} />
      </head>
      <body>{children}</body>
    </html>
  );
};
