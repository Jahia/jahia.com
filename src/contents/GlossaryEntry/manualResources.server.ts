import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { toCard } from "../../views/ResourceCarousel/selection.server.js";
import type { EntryResource } from "./deferredSuggestions.js";

/** Preserve the editor's order and never complete a manual selection with automatic matches. */
export function manualResources(
  nodes: Array<JCRNodeWrapper | null> = [],
  current: JCRNodeWrapper,
  locale: Parameters<JCRNodeWrapper["hasI18N"]>[0],
  depend: (node: JCRNodeWrapper) => void,
): EntryResource[] {
  const seen = new Set<string>();
  const items: EntryResource[] = [];
  for (const node of nodes) {
    if (!node) continue;
    try {
      depend(node);
      const id = node.getIdentifier();
      if (
        id === current.getIdentifier() ||
        seen.has(id) ||
        !node.hasPermission("jcr:read") ||
        !node.hasI18N(locale)
      )
        continue;
      const card = toCard(node, {
        allowGenericResource: true,
        includeCustomerCases: true,
        includePresentation: false,
      });
      if (!card) continue;
      seen.add(id);
      items.push({
        id,
        title: card.title,
        url: buildNodeUrl(node),
        kind: card.kind,
        description: card.description,
      });
    } catch {
      /* Deleted weak references or unavailable translations are not public resources. */
    }
  }
  return items;
}
