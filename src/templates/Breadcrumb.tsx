import { buildNodeUrl, useJCRQuery, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import classes from "./Breadcrumb.module.css";

type BreadcrumbItem = {
  id: string;
  label: string;
  node?: JCRNodeWrapper;
  href?: string;
};

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

export default function Breadcrumb({ pageType, title }: { pageType?: string; title: string }) {
  const { mainNode, renderContext } = useServerContext();
  const { t } = useTranslation();
  const home = renderContext.getSite().getHome();
  const request = renderContext.getRequest();
  const resourceLibrary = findResourceLibrary(mainNode, home);
  const blogPages = useJCRQuery({
    query: `
      SELECT * FROM [jnt:page]
      WHERE ISDESCENDANTNODE(${JSON.stringify(home.getPath())})
      AND NAME() = 'blog'
    `,
  });

  let items: BreadcrumbItem[] = [];

  if (pageType === "blog_post") {
    const blogQuery = ["cluster", "theme", "blogPage"].flatMap((name) => {
      const value = request.getParameter(name);
      return value ? [`${name}=${encodeURIComponent(value)}`] : [];
    });
    const blogHref = blogPages[0]
      ? `${buildNodeUrl(blogPages[0])}${blogQuery.length > 0 ? `?${blogQuery.join("&")}` : ""}`
      : undefined;

    items = [
      { id: home.getIdentifier(), label: t("breadcrumb.home"), node: home },
      {
        id: blogPages[0]?.getIdentifier() || "blog",
        label: t("breadcrumb.blog"),
        node: blogPages[0],
        href: blogHref,
      },
      { id: mainNode.getIdentifier(), label: title },
    ];
  } else if (pageType === "resource_library" || resourceLibrary) {
    items = [
      { id: home.getIdentifier(), label: t("breadcrumb.home"), node: home },
      ...(resourceLibrary && resourceLibrary.getIdentifier() !== mainNode.getIdentifier()
        ? [
            {
              id: resourceLibrary.getIdentifier(),
              label: resourceLibrary.getDisplayableName(),
              node: resourceLibrary,
            },
          ]
        : []),
      { id: mainNode.getIdentifier(), label: title },
    ];
  }

  if (items.length < 2) return null;

  return (
    <nav className={classes.breadcrumb} aria-label={t("breadcrumb.label")}>
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li key={item.id} aria-current={current ? "page" : undefined}>
              {!current && item.node ? (
                <a href={item.href || buildNodeUrl(item.node)}>{item.label}</a>
              ) : (
                item.label
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
