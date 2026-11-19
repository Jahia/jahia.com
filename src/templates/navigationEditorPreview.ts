import { projectUpperBar, upperBarUrl } from "../../javascript/navigation/upperBar.js";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { NavigationSettings } from "../../javascript/navigation/model.js";
import { validateSettings } from "../../javascript/navigation/model.js";
import { automaticNavigation } from "./automaticNavigation.js";
import type { NavbarButton, UtilityEntry, UtilityControls, Page } from "./NavBar.types.js";

export type PreviewNode = {
  id: string;
  name: string;
  path: string;
  kind: string;
  native: Record<string, string | string[]>;
  fr: Record<string, string>;
  en: Record<string, string>;
  children: PreviewNode[];
};

/** Read-only adapter: the editor's draft uses the same projection as the public navbar. */
export function navigationEditorPreview(
  sections: PreviewNode[],
  settings: NavigationSettings,
  site: string,
  language: "fr" | "en",
  context = "",
  imageUrls: Record<string, string> = {},
  references: PreviewNode[] = [],
) {
  validateSettings(settings);
  if (!/^[\w-]+$/.test(site) || !["fr", "en"].includes(language))
    throw Error("Invalid preview context");
  const nodes = new Map<string, PreviewNode>();
  const visit = (items: PreviewNode[], depth = 0) => {
    if (depth > 3 || nodes.size > 2000) throw Error("Preview tree too large");
    for (const item of items) {
      if (!/^[\w-]+$/.test(item.id) || !Array.isArray(item.children))
        throw Error("Invalid preview node");
      nodes.set(item.id, item);
      visit(item.children, depth + 1);
    }
  };
  visit(sections);
  const referenceIds = new Set(references.map((node) => node.id));
  visit(references.filter((node) => !nodes.has(node.id)));
  const safeUrl = (value: unknown) => {
    if (typeof value !== "string" || /[\s\\]/.test(value) || value.startsWith("//")) return;
    return /^(?:https?:\/\/|\/(?!\/))/.test(value) ? value : undefined;
  };
  const label = (node: PreviewNode) =>
    node[language].navAutoLabel ||
    node[language].navLabel ||
    node[language]["jcr:title"] ||
    node.name;
  const icon = (choice: { kind: string; name?: string; id?: string } | null | undefined) => {
    if (!choice) return;
    if (choice.kind === "preset" && ["cms", "dxp", "ai"].includes(choice.name || ""))
      return `${context}/modules/jahiacom/static/icons/navigation/${choice.name}.${choice.name === "ai" ? "svg" : "png"}`;
    return choice.kind === "image" ? safeUrl(imageUrls[choice.id || ""]) : undefined;
  };
  const wrappers = new Map<string, JCRNodeWrapper>();
  for (const node of nodes.values()) {
    const property = (key: string) => node[language][key] ?? node.native[key];
    wrappers.set(node.id, {
      getIdentifier: () => node.id,
      getPath: () => node.path,
      getDisplayableName: () => label(node),
      isNodeType: (type: string) => type === node.kind,
      hasPermission: () => true,
      hasProperty: (key: string) => property(key) !== undefined,
      getPropertyAsString: (key: string) => String(property(key) ?? ""),
      getProperty: (key: string) => ({
        getBoolean: () => property(key) === "true",
        getValues: () => {
          const value = property(key);
          return (Array.isArray(value) ? value : [String(value)]).map((item) => ({
            getString: () => item,
          }));
        },
        getValue: () => ({ getNode: () => wrappers.get(String(property(key))) }),
      }),
    } as unknown as JCRNodeWrapper);
  }
  const page = (
    wrapper: JCRNodeWrapper,
    title?: string,
    seen = new Set<string>(),
  ): Page | undefined => {
    const node = nodes.get(wrapper.getIdentifier());
    if (!node || seen.has(node.id)) return;
    if (
      node.kind !== "jnt:navMenuText" &&
      !node[language]["jcr:title"] &&
      !node[language].navLabel &&
      !node[language].navAutoLabel
    )
      return;
    seen.add(node.id);
    if (node.kind === "jnt:nodeLink") {
      const target = wrappers.get(String(node.native["j:node"]));
      const linked = target ? page(target, title || label(node), seen) : undefined;
      return linked
        ? {
            ...linked,
            icon: icon(
              node.native.navIconImage
                ? { kind: "image", id: String(node.native.navIconImage) }
                : { kind: "preset", name: String(node.native.navIcon || "") },
            ),
          }
        : undefined;
    }
    const href =
      node.kind === "jnt:externalLink"
        ? safeUrl(node.native["j:url"])
        : node.path === `/sites/${site}/home` ||
            node.path.startsWith(`/sites/${site}/home/`) ||
            (referenceIds.has(node.id) && node.path.startsWith(`/sites/${site}/`))
          ? `${context}/cms/render/default/${language}${node.path}.html`
          : undefined;
    if (!href) return;
    return {
      title: title || label(node),
      href,
      current: false,
      icon: icon(
        node.native.navIconImage
          ? { kind: "image", id: String(node.native.navIconImage) }
          : { kind: "preset", name: String(node.native.navIcon || "") },
      ),
    };
  };
  const home = { getIdentifier: () => "preview-home" } as JCRNodeWrapper;
  return automaticNavigation(home, {
    language,
    settings,
    cache: () => {},
    children: (node) =>
      (node === home ? sections : nodes.get(node.getIdentifier())?.children || []).map(
        (child) => wrappers.get(child.id)!,
      ),
    translated: (node) => {
      const value = nodes.get(node.getIdentifier());
      return (
        !!value &&
        (value.kind === "jnt:navMenuText" ||
          !!value[language]["jcr:title"] ||
          !!value[language].navLabel ||
          !!value[language].navAutoLabel)
      );
    },
    page,
    resolve: (id) => wrappers.get(id),
    icon,
    discoverLabel: (title) => `${language === "fr" ? "Découvrir" : "Discover"} ${title}`,
    presentation: (node, section) => {
      const source = nodes.get(node.getIdentifier())!;
      const feature = section?.feature;
      const target = wrappers.get(feature?.target || String(source.native.navFeatureLink || ""));
      const link =
        target && page(target, feature?.label[language] || source[language].navFeatureLabel);
      return {
        feature:
          link && feature?.visible !== false
            ? {
                heading: feature
                  ? feature.heading[language] || link.title
                  : source[language].navFeatureHeading || link.title,
                eyebrow: feature ? feature.eyebrow[language] : source[language].navFeatureEyebrow,
                text: feature ? feature.text[language] : source[language].navFeatureText,
                link,
              }
            : undefined,
      };
    },
  });
}

export type UpperBarPreview = {
  utilityEntries: UtilityEntry[];
  controls: UtilityControls;
  buttons: NavbarButton[];
  rss?: { href?: string; label: string; pendingLabel: string; image?: string };
};
/** Same read-only upper-bar projection for unsaved changes, with site-scoped references. */
export function upperBarEditorPreview(
  sections: PreviewNode[],
  settings: NavigationSettings,
  site: string,
  language: "fr" | "en",
  context = "",
  imageUrls: Record<string, string> = {},
  references: PreviewNode[] = [],
): UpperBarPreview | undefined {
  validateSettings(settings);
  if (!settings.upperBar) return;
  if (!/^[\w-]+$/.test(site) || !["fr", "en"].includes(language))
    throw Error("Invalid preview context");
  const nodes = new Map<string, PreviewNode>();
  const visit = (items: PreviewNode[], depth = 0) => {
    if (depth > 3 || nodes.size > 5000) throw Error("Preview tree too large");
    for (const item of items) {
      if (item.path?.startsWith("/sites/" + site + "/")) {
        nodes.set(item.id, item);
        visit(item.children || [], depth + 1);
      }
    }
  };
  visit(sections);
  visit(references);
  const page = (id: string, label?: string, seen = new Set<string>()): Page | undefined => {
    const node = nodes.get(id);
    if (
      !node ||
      seen.has(id) ||
      seen.size > 10 ||
      !["jnt:page", "jnt:nodeLink", "jnt:externalLink"].includes(node.kind)
    )
      return;
    seen.add(id);
    const invalid = node.native["j:invalidLanguages"];
    if (
      (Array.isArray(invalid) ? invalid : [invalid]).includes(language) ||
      !node[language]?.["jcr:title"]
    )
      return;
    const title =
      label ||
      node[language].navUtilityLabel ||
      node[language].navLabel ||
      node[language]["jcr:title"];
    if (node.kind === "jnt:nodeLink") return page(String(node.native["j:node"]), title, seen);
    const href =
      node.kind === "jnt:externalLink"
        ? upperBarUrl(String(node.native["j:url"]), true)
        : context + "/cms/render/default/" + language + node.path + ".html";
    return href ? { href, title, current: false } : undefined;
  };
  return projectUpperBar(settings.upperBar, language, page, (id: string) =>
    upperBarUrl(imageUrls[id], true),
  ) as UpperBarPreview;
}
