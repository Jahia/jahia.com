import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { BreadcrumbSettings } from "../../javascript/breadcrumb/model.js";
import { decode, defaults } from "../../javascript/breadcrumb/model.js";
export type BreadcrumbItem = { id: string; label: string; node?: JCRNodeWrapper; href?: string };
type Options = {
  settings: BreadcrumbSettings;
  language: string;
  homeLabel: string;
  title: string;
  available: (node: JCRNodeWrapper) => boolean;
  resolve: (id: string) => JCRNodeWrapper | undefined;
  url: (node: JCRNodeWrapper) => string;
  cache: (node: JCRNodeWrapper) => void;
  index?: JCRNodeWrapper;
  omitAncestorPath?: string;
};
export function readBreadcrumbSettings(site: JCRNodeWrapper, cache: Options["cache"]) {
  cache(site);
  try {
    if (!site.hasNode("breadcrumb-settings")) return defaults();
    const node = site.getNode("breadcrumb-settings");
    cache(node);
    return node.isNodeType("jahiacom:breadcrumbSettings") && node.hasProperty("configuration")
      ? decode(node.getPropertyAsString("configuration"))
      : defaults();
  } catch {
    return defaults();
  }
}
/** Visitor-facing hierarchy: virtual groups never become fake URLs. */
export function breadcrumbItems(
  main: JCRNodeWrapper,
  home: JCRNodeWrapper,
  options: Options,
): BreadcrumbItem[] {
  if (!options.settings.enabled || main.getIdentifier() === home.getIdentifier()) return [];
  const current = options.index || main,
    homePath = home.getPath(),
    ancestors: JCRNodeWrapper[] = [],
    visited = new Set<string>();
  let node: JCRNodeWrapper | undefined = current;
  while (node && node.getIdentifier() !== home.getIdentifier() && ancestors.length < 64) {
    const path = node.getPath(),
      id = node.getIdentifier();
    if (!path.startsWith(homePath + "/") || visited.has(id)) return [];
    visited.add(id);
    ancestors.unshift(node);
    try {
      node = node.getParent() as JCRNodeWrapper;
    } catch {
      return [];
    }
  }
  if (
    !node ||
    node.getIdentifier() !== home.getIdentifier() ||
    !options.available(main) ||
    (options.index && !options.available(current))
  )
    return [];
  const safe = (candidate: JCRNodeWrapper | undefined): candidate is JCRNodeWrapper => {
    if (!candidate) return false;
    options.cache(candidate);
    return (
      candidate.getPath().startsWith(homePath.slice(0, homePath.lastIndexOf("/")) + "/") &&
      candidate.isNodeType("jnt:page") &&
      options.available(candidate)
    );
  };
  const mother = (group: JCRNodeWrapper) => {
    const custom = options.settings.parents[group.getIdentifier()];
    if (custom) {
      try {
        const target = options.resolve(custom);
        if (safe(target)) return target;
      } catch {
        /*Missing reference.*/
      }
    }
  };
  const label = (source: JCRNodeWrapper, fallback?: string) =>
    options.settings.labels[source.getIdentifier()]?.[options.language]?.trim() ||
    fallback ||
    (source.hasProperty("navLabel") ? source.getPropertyAsString("navLabel")?.trim() : "") ||
    source.getDisplayableName();
  const url = (target: JCRNodeWrapper) => {
    try {
      const href = options.url(target);
      return /^(?:\/(?!\/)|https?:\/\/)/i.test(href) && !/[\\\r\n]/.test(href) ? href : undefined;
    } catch {
      return undefined;
    }
  };
  const homeAvailable = options.available(home);
  const result: BreadcrumbItem[] = [
    {
      id: home.getIdentifier(),
      label: options.settings.homeLabels[options.language]?.trim() || options.homeLabel,
      node: homeAvailable ? home : undefined,
      href: homeAvailable ? url(home) : undefined,
    },
  ];
  const added = new Set([home.getIdentifier()]);
  let currentAlias: string | undefined;
  for (const ancestor of ancestors) {
    options.cache(ancestor);
    if (ancestor.getPath() === options.omitAncestorPath) continue;
    if (!options.available(ancestor)) continue;
    if (ancestor.getIdentifier() === current.getIdentifier()) continue;
    let target: JCRNodeWrapper | undefined;
    if (ancestor.isNodeType("jnt:page")) target = ancestor;
    else if (ancestor.isNodeType("jnt:navMenuText")) {
      target = mother(ancestor);
      if (!target && ancestor.getParent().getPath() !== homePath) continue;
    } else continue;
    if (target?.getIdentifier() === current.getIdentifier()) {
      currentAlias = options.settings.labels[ancestor.getIdentifier()]?.[options.language]?.trim();
      continue;
    }
    const identity = target?.getIdentifier() || ancestor.getIdentifier();
    if (added.has(identity)) continue;
    added.add(identity);
    result.push({
      id: ancestor.getIdentifier(),
      label: label(ancestor),
      node: target,
      href: target ? url(target) : undefined,
    });
  }
  if (options.index && options.available(current) && !added.has(current.getIdentifier()))
    result.push({
      id: current.getIdentifier(),
      label: label(current, currentAlias),
      node: current,
      href: url(current),
    });
  result.push({
    id: main.getIdentifier(),
    label: label(main, options.index ? options.title : currentAlias || options.title),
  });
  return result;
}
