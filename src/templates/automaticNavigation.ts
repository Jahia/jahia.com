import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { Entry, NavigationPanel, Page } from "./NavBar.types.js";
import type {
  NavigationSettings,
  SectionSettings,
  NavigationIcon,
} from "../../javascript/navigation/model.js";

type Options = {
  language: string;
  translated: (node: JCRNodeWrapper) => boolean;
  children: (node: JCRNodeWrapper) => JCRNodeWrapper[];
  cache: (node: JCRNodeWrapper) => void;
  page: (node: JCRNodeWrapper, label?: string) => Page | undefined;
  discoverLabel: (title: string) => string;
  presentation?: (node: JCRNodeWrapper, settings?: SectionSettings) => NavigationPanel;
  settings?: NavigationSettings;
  resolve?: (id: string) => JCRNodeWrapper | undefined;
  icon?: (choice: NavigationIcon) => string | undefined;
};

const text = (node: JCRNodeWrapper, name: string) =>
  node.hasProperty(name) ? node.getPropertyAsString(name)?.trim() : undefined;

/** A bounded projection of the site tree; references remain leaves, never recursive roots. */
export function automaticNavigation(root: JCRNodeWrapper, options: Options): Entry[] {
  const eligible = (node: JCRNodeWrapper, settings?: SectionSettings) => {
    options.cache(node);
    if (!node.hasPermission("jcr:read") || !options.translated(node)) return false;
    if (
      settings
        ? settings.excluded.includes(node.getIdentifier())
        : node.hasProperty("navExcluded") && node.getProperty("navExcluded").getBoolean()
    )
      return false;
    return (
      !node.hasProperty("j:invalidLanguages") ||
      !node
        .getProperty("j:invalidLanguages")
        .getValues()
        .some((value) => value.getString() === options.language)
    );
  };
  const reference = (node: JCRNodeWrapper, property: string, settings?: SectionSettings) => {
    if (!node.hasProperty(property)) return;
    try {
      const target = node.getProperty(property).getValue().getNode();
      return target && eligible(target, settings) ? options.page(target) : undefined;
    } catch {
      // A removed optional target must not remove its branch.
      return undefined;
    }
  };
  const visit = (
    parent: JCRNodeWrapper,
    level: number,
    inherited?: SectionSettings,
    branch?: string,
  ): Entry[] => {
    options.cache(parent);
    return options.children(parent).flatMap((node): Entry[] => {
      try {
        const id = node.getIdentifier();
        const settings = level === 1 ? options.settings?.sections[id] : inherited;
        const branchId = level === 2 ? id : branch;
        const depth = Math.max(0, level - 2);
        if (!eligible(node, settings) || (level === 1 && settings?.mode === "hidden")) return [];
        const group = node.isNodeType("jnt:navMenuText");
        const page = node.isNodeType("jnt:page");
        if (
          !group &&
          !page &&
          !node.isNodeType("jnt:nodeLink") &&
          !node.isNodeType("jnt:externalLink")
        )
          return [];
        const title =
          settings?.labels[id]?.[options.language]?.trim() ||
          text(node, "navAutoLabel") ||
          text(node, "navLabel") ||
          node.getDisplayableName();
        // Internal links do not bypass the target's visibility, language or permissions.
        if (node.isNodeType("jnt:nodeLink")) {
          const target = node.getProperty("j:node").getValue().getNode();
          if (!target || !eligible(target, settings)) return [];
        }
        let destination = group
          ? reference(node, "navLandingPage", settings) ||
            reference(node, "navDiscoverPage", settings)
          : options.page(node, title);
        if (destination) {
          destination.title = title;
          destination.id = id;
          destination.branchId = branchId;
          destination.depth = depth;
        }
        const configuredDiscover = level === 1 ? settings?.discover : undefined;
        let discoverTarget = node.hasProperty("navDiscoverPage")
          ? reference(node, "navDiscoverPage", settings)
          : destination;
        if (configuredDiscover?.target) {
          try {
            const target = options.resolve?.(configuredDiscover.target);
            discoverTarget =
              target && eligible(target, settings) ? options.page(target) : undefined;
          } catch {
            discoverTarget = undefined;
          }
        }
        if (
          group &&
          level === 1 &&
          settings?.mode === "link" &&
          configuredDiscover?.target &&
          discoverTarget
        ) {
          destination = { ...discoverTarget, title, id, branchId, depth };
        }
        if (destination) destination.weight = settings?.weights?.[id];
        if (destination && settings?.icons && Object.hasOwn(settings.icons, id))
          destination.icon = options.icon?.(settings.icons[id]);
        const expandChildren = settings
          ? !(level === 1 && settings.mode === "link") && !settings.direct.includes(id)
          : !node.hasProperty("navExpandChildren") ||
            node.getProperty("navExpandChildren").getBoolean();
        const children =
          level < 3 && (group || page) && expandChildren
            ? visit(node, level + 1, settings, branchId)
            : [];
        // A group's overview page already has a dedicated destination; avoid duplicate entries.
        const entries = children.filter(
          (child) => !("href" in child) || !destination || child.href !== destination.href,
        );
        const selected =
          level === 1 || settings?.mode !== "selected" || settings.selected.includes(id);
        if (!entries.length) {
          if (level === 1 && settings && settings.mode !== "link") return [];
          return selected && destination ? [destination] : [];
        }
        const discoverVisible = configuredDiscover
          ? configuredDiscover.visible
          : !node.hasProperty("navDiscoverVisible") ||
            node.getProperty("navDiscoverVisible").getBoolean();
        let presentation: NavigationPanel | undefined;
        try {
          if (level === 1) presentation = options.presentation?.(node, settings);
        } catch {
          // Optional old-style presentation must not remove an otherwise valid menu.
        }
        return [
          {
            title,
            id,
            weight: settings?.weights?.[id],
            branchId,
            depth,
            icon:
              level === 1 && settings?.icons && Object.hasOwn(settings.icons, id)
                ? options.icon?.(settings.icons[id])
                : undefined,
            destination: selected ? destination : undefined,
            children: entries,
            panel: {
              ...presentation,
              automatic: true,
              treeColumns: settings?.columnCount || 2,
              branchColumns: settings?.columns || {},
              branchOrder: settings?.order || {},
              childOrder: settings?.childOrder || {},
              landing:
                discoverVisible && discoverTarget
                  ? {
                      ...discoverTarget,
                      title:
                        configuredDiscover?.labels[options.language]?.trim() ||
                        text(node, "navDiscoverLabel") ||
                        options.discoverLabel(title),
                    }
                  : undefined,
            },
          },
        ];
      } catch {
        // Omit only the inaccessible or broken entry, preserving its siblings.
        return [];
      }
    });
  };
  return visit(root, 1);
}
