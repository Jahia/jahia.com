import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { RESOURCE_MODEL } from "./contentModel.js";
import type { ResourceCardData, ResourceKind, SelectionMode } from "./types.js";

const MIN_CONFIGURED_ITEMS = 6;
const MAX_ITEMS = 12;
const DEFAULT_ITEMS = 9;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "-")
    .trim();

const RESOURCE_TYPE_ALIASES: Record<string, ResourceKind> = {
  "blog": "blog",
  "webinar": "webinar",
  "webinars": "webinar",
  "webinaire": "webinar",
  "webinaires": "webinar",
  "whitepaper": "whitepaper",
  "whitepapers": "whitepaper",
  "white-paper": "whitepaper",
  "livre-blanc": "whitepaper",
  "livres-blancs": "whitepaper",
  "customer-case": "customerCase",
  "customer-cases": "customerCase",
  "case-study": "customerCase",
  "case-studies": "customerCase",
  "cas-client": "customerCase",
  "cas-clients": "customerCase",
  "video": "video",
  "videos": "video",
  "infographic": "infographic",
  "infographics": "infographic",
  "infographie": "infographic",
  "infographies": "infographic",
};

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

const isPublished = (node: JCRNodeWrapper) => {
  try {
    return node.hasProperty("j:published") && node.getProperty("j:published").getBoolean();
  } catch {
    return false;
  }
};

const firstDate = (node: JCRNodeWrapper, names: readonly string[]) => {
  for (const name of names) {
    try {
      if (!node.hasProperty(name)) continue;
      const property = node.getProperty(name);
      const value = node.getPropertyAsString(name);
      const dateValue = property.getValue() as unknown as {
        getDate: () => { getTimeInMillis: () => number };
      };
      const timestamp = Number(dateValue.getDate().getTimeInMillis());
      if (Number.isFinite(timestamp)) return { value, timestamp };
    } catch {
      const value = firstString(node, [name]);
      const timestamp = Date.parse(value);
      if (value && Number.isFinite(timestamp)) return { value, timestamp };
    }
  }
  return { value: "", timestamp: 0 };
};

const referencedNodes = (node: JCRNodeWrapper, propertyNames: readonly string[]) => {
  for (const propertyName of propertyNames) {
    try {
      const property = node.getProperty(propertyName);
      const values = property.isMultiple() ? property.getValues() : [property.getValue()];
      const references = values.map((value) => value.getNode()).filter(Boolean) as JCRNodeWrapper[];
      if (references.length > 0) return references;
    } catch {
      // Try the next property candidate.
    }
  }

  return [];
};

const categoryLineageIds = (category: JCRNodeWrapper) => {
  const ids: string[] = [];
  let current: JCRNodeWrapper | null = category;

  for (let depth = 0; current && depth < 12; depth++) {
    try {
      if (!current.isNodeType("jnt:category")) break;
      ids.push(identity(current));
      current = current.getParent() as JCRNodeWrapper;
    } catch {
      break;
    }
  }

  return ids;
};

const categoryResourceType = (categories: JCRNodeWrapper[]) => {
  for (const category of categories) {
    const kind =
      RESOURCE_TYPE_ALIASES[normalize(category.getName())] ||
      RESOURCE_TYPE_ALIASES[normalize(category.getDisplayableName())];
    if (kind) return { kind, label: category.getDisplayableName() };
  }

  return null;
};

const resolveResourceType = (
  node: JCRNodeWrapper,
  categories: JCRNodeWrapper[],
  allowGenericResource: boolean,
) => {
  if (node.isNodeType(RESOURCE_MODEL.blogNodeType)) {
    return { kind: "blog" as const };
  }

  const categoryType = categoryResourceType(categories);
  if (categoryType) return categoryType;

  const pageType = normalize(firstString(node, [RESOURCE_MODEL.properties.pageType]));
  const kind =
    RESOURCE_MODEL.resourcePageTypes[pageType as keyof typeof RESOURCE_MODEL.resourcePageTypes];
  if (kind) return { kind };

  return allowGenericResource ? { kind: "resource" as const } : null;
};

const toCard = (
  node: JCRNodeWrapper,
  { allowGenericResource = false }: { allowGenericResource?: boolean } = {},
): ResourceCardData | null => {
  if (
    !node.isNodeType(RESOURCE_MODEL.blogNodeType) &&
    !node.isNodeType(RESOURCE_MODEL.pageNodeType)
  ) {
    return null;
  }

  if (!isPublished(node)) return null;

  const categories = referencedNodes(node, [RESOURCE_MODEL.properties.categories]);
  const resourceType = resolveResourceType(node, categories, allowGenericResource);
  if (!resourceType || resourceType.kind === "customerCase") return null;

  const { value: date, timestamp } = firstDate(node, RESOURCE_MODEL.properties.dates);
  if (timestamp > Date.now()) return null;

  const title = firstString(node, [RESOURCE_MODEL.properties.title]) || node.getDisplayableName();
  if (!title) return null;

  return {
    id: identity(node),
    title,
    description: firstString(node, RESOURCE_MODEL.properties.descriptions),
    url: buildNodeUrl(node),
    date,
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    image: referencedNodes(node, RESOURCE_MODEL.properties.images)[0],
    kind: resourceType.kind,
    typeLabel: "label" in resourceType ? resourceType.label : undefined,
    taxonomyIds: [
      ...new Set([
        ...categories.flatMap(categoryLineageIds),
        ...referencedNodes(node, [RESOURCE_MODEL.properties.clusters]).map(identity),
      ]),
    ],
  };
};

const unique = (items: ResourceCardData[]) => {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
};

const byNewest = (first: ResourceCardData, second: ResourceCardData) =>
  second.timestamp - first.timestamp || first.title.localeCompare(second.title);

const matchesAny = (item: ResourceCardData, categoryIds: string[]) =>
  categoryIds.length === 0 || categoryIds.some((id) => item.taxonomyIds.includes(id));

const matchesFilters = (
  item: ResourceCardData,
  thematicIds: string[],
  contentTypeIds: string[],
  legacyIds: string[],
) => {
  if (thematicIds.length > 0 || contentTypeIds.length > 0) {
    return matchesAny(item, thematicIds) && matchesAny(item, contentTypeIds);
  }

  return matchesAny(item, legacyIds);
};

export const sanitizeCount = (value?: number) =>
  Math.max(MIN_CONFIGURED_ITEMS, Math.min(MAX_ITEMS, Number(value) || DEFAULT_ITEMS));

export function selectResources({
  candidates,
  manualNodes,
  currentNode,
  count,
  mode,
  thematicIds,
  contentTypeIds,
  legacyIds,
  completeFallback,
  minimumItems,
}: {
  candidates: JCRNodeWrapper[];
  manualNodes: JCRNodeWrapper[];
  currentNode: JCRNodeWrapper;
  count: number;
  mode: SelectionMode;
  thematicIds: string[];
  contentTypeIds: string[];
  legacyIds: string[];
  completeFallback: boolean;
  minimumItems: number;
}) {
  const minimum = Math.max(1, Math.min(count, minimumItems));
  const currentId = identity(currentNode);
  const automatic = unique(
    candidates
      .map((node) => toCard(node))
      .filter((item): item is ResourceCardData => Boolean(item)),
  )
    .filter((item) => item.id !== currentId)
    .sort(byNewest);
  const hasCategoryFilters = thematicIds.length > 0 || contentTypeIds.length > 0;
  const filterPool = hasCategoryFilters
    ? unique(
        candidates
          .map((node) => toCard(node, { allowGenericResource: true }))
          .filter((item): item is ResourceCardData => Boolean(item)),
      )
        .filter((item) => item.id !== currentId)
        .sort(byNewest)
    : automatic;

  if (mode === "manual") {
    const manual = unique(
      manualNodes
        .map((node) => toCard(node, { allowGenericResource: true }))
        .filter((item): item is ResourceCardData => Boolean(item)),
    ).filter((item) => item.id !== currentId);
    const fallback = filterPool.filter((item) =>
      matchesFilters(item, thematicIds, contentTypeIds, legacyIds),
    );
    const selected = completeFallback
      ? unique([...manual, ...fallback, ...automatic]).slice(0, count)
      : manual;
    return selected.length >= minimum ? selected.slice(0, count) : [];
  }

  if (mode === "automatic") {
    const selected = automatic.slice(0, count);
    return selected.length >= minimum ? selected : [];
  }

  const filtered = filterPool.filter((item) =>
    matchesFilters(item, thematicIds, contentTypeIds, legacyIds),
  );
  const selected = completeFallback
    ? unique([...filtered, ...automatic]).slice(0, count)
    : filtered;
  return selected.length >= minimum ? selected.slice(0, count) : [];
}
