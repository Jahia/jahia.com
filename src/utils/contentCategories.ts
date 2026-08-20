import type { JCRNodeWrapper } from "org.jahia.services.content";
import migration from "../../settings/category-migration-1.3.3.json";

type Section = keyof typeof migration;

const entries = Object.fromEntries(
  Object.entries(migration).map(([section, items]) => [
    section,
    new Map(items.map((item) => [item.name, item.categoryPaths])),
  ]),
) as Record<Section, Map<string, string[]>>;

const sectionFor = (node: JCRNodeWrapper): Section | undefined => {
  if (node.isNodeType("jahiacom:blogEntry")) return "blog";
  const path = node.getPath();
  if (path.includes("/home/customer-stories/")) return "customerStories";
  if (path.includes("/home/resources/livres-blancs-videos-autres/")) return "resources";
  return undefined;
};

export const referencedCategories = (node: JCRNodeWrapper) => {
  if (!node.hasProperty("j:defaultCategory")) return [];
  return node
    .getProperty("j:defaultCategory")
    .getValues()
    .map((value) => value.getNode() as JCRNodeWrapper | null)
    .filter((category): category is JCRNodeWrapper => category !== null);
};

export const contentCategories = (node: JCRNodeWrapper) => {
  const assigned = referencedCategories(node);
  if (assigned.length > 0) return assigned;

  const section = sectionFor(node);
  const paths = section ? entries[section].get(node.getName()) || [] : [];
  const session = node.getSession();
  return paths
    .filter((path) => session.nodeExists(path))
    .map((path) => session.getNode(path) as JCRNodeWrapper);
};

export const availableCategories = (node: JCRNodeWrapper, paths: string[]) => {
  const session = node.getSession();
  return paths
    .filter((path) => session.nodeExists(path))
    .map((path) => session.getNode(path) as JCRNodeWrapper);
};
