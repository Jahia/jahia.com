import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { RESOURCE_MODEL } from "./contentModel.js";
import type { ResourceCardData, SelectionMode } from "./types.js";

const MIN_CONFIGURED_ITEMS = 6;
const MAX_ITEMS = 12;
const DEFAULT_ITEMS = 9;

const identity = (node: JCRNodeWrapper) => {
  try {
    return node.getIdentifier();
  } catch {
    return node.getPath();
  }
};

const firstString = (node: JCRNodeWrapper, names: readonly string[]) => {
  for (const name of names) {
    try {
      const value = node.getPropertyAsString(name);
      if (value) return value;
    } catch {
      // Try the next property candidate.
    }
  }

  return "";
};

const referencedNodes = (node: JCRNodeWrapper, propertyName: string) => {
  try {
    const property = node.getProperty(propertyName);
    const values = property.isMultiple() ? property.getValues() : [property.getValue()];
    return values.map((value) => value.getNode()).filter(Boolean) as JCRNodeWrapper[];
  } catch {
    return [];
  }
};

const toCard = (node: JCRNodeWrapper): ResourceCardData | null => {
  if (!node.isNodeType(RESOURCE_MODEL.nodeType)) return null;

  const date = firstString(node, [RESOURCE_MODEL.properties.date]);
  const timestamp = date ? Date.parse(date) : 0;
  if (timestamp && timestamp > Date.now()) return null;

  const title = firstString(node, [RESOURCE_MODEL.properties.title]) || node.getDisplayableName();
  if (!title) return null;

  return {
    id: identity(node),
    title,
    description: firstString(node, RESOURCE_MODEL.properties.descriptions),
    url: buildNodeUrl(node),
    date,
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    image: referencedNodes(node, RESOURCE_MODEL.properties.image)[0],
    clusters: referencedNodes(node, RESOURCE_MODEL.properties.clusters).map(identity),
  };
};

const unique = (items: ResourceCardData[]) => {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
};

const byNewest = (first: ResourceCardData, second: ResourceCardData) =>
  second.timestamp - first.timestamp || first.title.localeCompare(second.title);

const matchesClusters = (item: ResourceCardData, clusterIds: string[]) =>
  clusterIds.length === 0 || clusterIds.some((clusterId) => item.clusters.includes(clusterId));

export const sanitizeCount = (value?: number) =>
  Math.max(MIN_CONFIGURED_ITEMS, Math.min(MAX_ITEMS, Number(value) || DEFAULT_ITEMS));

export function selectResources({
  candidates,
  manualNodes,
  currentNode,
  count,
  mode,
  clusterIds,
  completeFallback,
  minimumItems,
}: {
  candidates: JCRNodeWrapper[];
  manualNodes: JCRNodeWrapper[];
  currentNode: JCRNodeWrapper;
  count: number;
  mode: SelectionMode;
  clusterIds: string[];
  completeFallback: boolean;
  minimumItems: number;
}) {
  const minimum = Math.max(1, Math.min(count, minimumItems));
  const currentId = identity(currentNode);
  const all = unique(
    candidates.map(toCard).filter((item): item is ResourceCardData => Boolean(item)),
  )
    .filter((item) => item.id !== currentId)
    .sort(byNewest);

  if (mode === "manual") {
    const manual = unique(
      manualNodes.map(toCard).filter((item): item is ResourceCardData => Boolean(item)),
    ).filter((item) => item.id !== currentId);
    const selected = completeFallback ? unique([...manual, ...all]).slice(0, count) : manual;
    return selected.length >= minimum ? selected.slice(0, count) : [];
  }

  if (mode === "automatic") {
    const selected = all.slice(0, count);
    return selected.length >= minimum ? selected : [];
  }

  const filtered = all.filter((item) => matchesClusters(item, clusterIds));
  const selected = completeFallback ? unique([...filtered, ...all]).slice(0, count) : filtered;
  return selected.length >= minimum ? selected.slice(0, count) : [];
}
