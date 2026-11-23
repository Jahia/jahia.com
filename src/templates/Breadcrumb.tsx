import {
  buildNodeUrl,
  Island,
  server,
  useJCRQuery,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { resolveGlossaryIndex } from "../contents/GlossaryEntry/indexPage.js";
import { authorDirectoryPage } from "../views/Authors/folder.server.js";
import classes from "./Breadcrumb.module.css";
import ResourceUrl from "../components/ResourceUrl.client.jsx";

import { breadcrumbItems, readBreadcrumbSettings } from "./breadcrumbModel.js";

const RESOURCE_LIBRARY_PATH =
  /\/(?:livres-blancs-videos-autres|whitepapers-videos-(?:and-)?others?)$/i;

const findResourceLibrary = (
  node: JCRNodeWrapper,
  home: JCRNodeWrapper,
): JCRNodeWrapper | undefined => {
  const homePath = home.getPath();
  let current: JCRNodeWrapper | undefined = node;

  while (
    current &&
    (current.getPath() === homePath || current.getPath().startsWith(`${homePath}/`))
  ) {
    if (
      (current.hasProperty("pageType") &&
        current.getPropertyAsString("pageType") === "resource_library") ||
      RESOURCE_LIBRARY_PATH.test(current.getPath())
    )
      return current;
    if (current.getIdentifier() === home.getIdentifier()) break;
    current = current.getParent() as JCRNodeWrapper;
  }

  return undefined;
};

export default function Breadcrumb({
  pageType,
  title,
}: {
  pageType?: string;
  title: string;
  glossaryHub?: boolean;
}) {
  const { mainNode, renderContext, currentResource } = useServerContext();
  const { t } = useTranslation();
  const home = renderContext.getSite().getHome();
  const resourceLibrary = findResourceLibrary(mainNode, home);
  const blogPages = useJCRQuery({
    query: `
      SELECT * FROM [jnt:page]
      WHERE ISDESCENDANTNODE(${JSON.stringify(home.getPath())})
      AND NAME() = 'blog'
    `,
  });

  const cache = (node: JCRNodeWrapper) =>
    server.render.addCacheDependency({ path: node.getPath() }, renderContext);
  const settings = readBreadcrumbSettings(renderContext.getSite(), cache);
  const locale = currentResource.getLocale(),
    language = locale.getLanguage();
  const available = (node: JCRNodeWrapper) => {
    try {
      cache(node);
      if (!node.hasPermission("jcr:read") || !node.hasI18N(locale)) return false;
      const translation = "j:translation_" + language;
      if (node.hasNode(translation)) cache(node.getNode(translation));
      return (
        !node.hasProperty("j:invalidLanguages") ||
        !Array.from(node.getProperty("j:invalidLanguages").getValues()).some(
          (value) => value.getString() === language,
        )
      );
    } catch {
      return false;
    }
  };
  let index: JCRNodeWrapper | undefined;
  if (mainNode.isNodeType("jahiacom:glossaryEntry")) index = resolveGlossaryIndex(mainNode, cache);
  else if (mainNode.isNodeType("jahiacom:blogAuthor")) index = authorDirectoryPage(mainNode, cache);
  else if (pageType === "blog_post") index = blogPages.find(available);
  const items = breadcrumbItems(mainNode, home, {
    settings,
    language,
    title,
    homeLabel: t("breadcrumb.home"),
    index,
    cache,
    available,
    url: (node) => buildNodeUrl(node),
    resolve: (id) => {
      try {
        const node = home.getSession().getNodeByIdentifier(id);
        return node.getPath().startsWith(renderContext.getSite().getPath() + "/")
          ? node
          : undefined;
      } catch {
        return undefined;
      }
    },
  });

  if (items.length < 2) return null;

  return (
    <nav
      className={classes.breadcrumb}
      data-glossary={mainNode.isNodeType("jahiacom:glossaryEntry") || undefined}
      aria-label={t("breadcrumb.label")}
    >
      {(pageType === "blog_post" || pageType === "resource_library" || resourceLibrary) && (
        <Island component={ResourceUrl} />
      )}
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li key={item.id} aria-current={current ? "page" : undefined}>
              {!current && item.href ? <a href={item.href}>{item.label}</a> : item.label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
