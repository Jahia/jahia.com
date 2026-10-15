import { navigationUrl } from "./navigationUrl.js";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/** Resolve an optional editorial reference before handing plain data to React. */
export function referenceLink(
  readNode: () => JCRNodeWrapper | null | undefined | false,
  buildUrl: (node: JCRNodeWrapper) => string,
  label?: string,
) {
  try {
    const node = readNode();
    if (!node || !node.hasPermission("jcr:read")) return undefined;
    const href = navigationUrl(buildUrl(node));
    if (!href) return undefined;
    return {
      href,
      title: label || node.getDisplayableName(),
      id: node.getIdentifier(),
      name: node.getName(),
    };
  } catch {
    // A weak reference can disappear or become inaccessible in the current workspace.
    return undefined;
  }
}
