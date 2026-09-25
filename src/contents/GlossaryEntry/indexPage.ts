import type { JCRNodeWrapper } from "org.jahia.services.content";

/** Folder configuration wins; existing entry references remain a legacy fallback. */
export function resolveGlossaryIndex(
  entry: JCRNodeWrapper,
  depend: (node: JCRNodeWrapper) => void,
): JCRNodeWrapper | undefined {
  const reference = (node: JCRNodeWrapper, property: string) => {
    if (!node.hasProperty(property)) return undefined;
    try {
      const target = node.getProperty(property).getNode() as JCRNodeWrapper | null;
      if (target?.isNodeType("jnt:page") && target.hasPermission("jcr:read")) {
        depend(target);
        return target;
      }
    } catch {
      // An unresolved optional weak reference must not break the detail page.
    }
    return undefined;
  };
  let current = entry.getParent() as JCRNodeWrapper;
  let parentPage: JCRNodeWrapper | undefined;
  while (current.getPath() !== "/" && !current.isNodeType("jnt:virtualsite")) {
    depend(current);
    const index = reference(current, "glossaryIndexPage");
    if (index) return index;
    if (!parentPage && current.isNodeType("jnt:page")) parentPage = current;
    current = current.getParent() as JCRNodeWrapper;
  }
  depend(entry);
  return reference(entry, "indexPage") || parentPage;
}
