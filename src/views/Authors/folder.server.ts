import type { JCRNodeWrapper } from "org.jahia.services.content";

export function isAuthorSourceFolder(folder: JCRNodeWrapper, sitePath: string) {
  return (
    folder.getPath().startsWith(sitePath + "/contents/") &&
    folder.isNodeType("jnt:contentFolder") &&
    folder.hasPermission("jcr:read")
  );
}

export function findAuthorFolder(author: JCRNodeWrapper, depend: (node: JCRNodeWrapper) => void) {
  const sitePath = author.getPath().match(/^\/sites\/[^/]+/)?.[0];
  let current = author.getParent() as JCRNodeWrapper;
  for (
    let depth = 0;
    depth < 32 && sitePath && current.getPath().startsWith(`${sitePath}/`);
    depth++
  ) {
    depend(current);
    if (current.isNodeType("jahiacommix:authorFolder") && current.hasPermission("jcr:read"))
      return current;
    if (current.getName().toLowerCase() === "authors" && isAuthorSourceFolder(current, sitePath))
      return current;
    current = current.getParent() as JCRNodeWrapper;
  }
  return undefined;
}

export function authorDirectoryPage(
  author: JCRNodeWrapper,
  depend: (node: JCRNodeWrapper) => void,
) {
  const folder = findAuthorFolder(author, depend);
  if (!folder?.hasProperty("authorDirectoryPage")) return undefined;
  try {
    const page = folder.getProperty("authorDirectoryPage").getValue().getNode();
    const sitePath = folder.getPath().match(/^\/sites\/[^/]+/)?.[0];
    if (
      page?.isNodeType("jnt:page") &&
      page.getPath().startsWith(`${sitePath}/home/`) &&
      page.hasPermission("jcr:read")
    ) {
      depend(page);
      return page;
    }
  } catch {
    /* Optional weak reference. */
  }
  return undefined;
}
