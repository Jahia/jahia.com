import {
  buildModuleFileUrl,
  buildNodeUrl,
  getChildNodes,
  getSiteLocales,
  Island,
  server,
  useJCRQuery,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { JCRSiteNode } from "org.jahia.services.content.decorator";
import jahia from "../../static/logos/jahia.svg?no-inline";
import NavBarClient from "./NavBar.client.jsx";
import type {
  Entry,
  HomeNavbarButtonFields,
  NavbarButton,
  NavigationItemFields,
  NavigationPanel,
  NavigationPanelFields,
  Page,
  UtilityControls,
  UtilityEntry,
} from "./NavBar.types.js";
import { navigationUrl } from "./navigationUrl.js";
import { referenceLink } from "./referenceLink.js";

const text = (
  node: JCRNodeWrapper,
  property: keyof NavigationItemFields | keyof NavigationPanelFields | keyof HomeNavbarButtonFields,
) => (node.hasProperty(property) ? node.getPropertyAsString(property) : undefined);
const itemContent = (node: JCRNodeWrapper) => {
  const image = referenceLink(
    () => node.hasProperty("navIconImage") && node.getProperty("navIconImage").getValue().getNode(),
    (image) => {
      server.render.addCacheDependency({ path: image.getPath() }, useServerContext().renderContext);
      return buildNodeUrl(image);
    },
  );
  return {
    icon: image?.href,
  };
};

const itemLabel = (node: JCRNodeWrapper) =>
  text(node, "navLabel")?.trim() || node.getDisplayableName().trim();

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
const emptySearchTerm = "jahia_no_search_requested_92f4c7";

const searchTerms = (value: string) => {
  const normalized = [...value.normalize("NFKC")]
    .map((character) => {
      const code = character.codePointAt(0) || 0;
      return code <= 31 ||
        (code >= 127 && code <= 159) ||
        (code >= 8234 && code <= 8238) ||
        (code >= 8294 && code <= 8297)
        ? " "
        : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const terms = normalized.match(/[\p{L}\p{N}]+/gu) || [];
  const valid =
    normalized.length >= 2 &&
    normalized.length <= 120 &&
    terms.length > 0 &&
    terms.length <= 12 &&
    terms.every((term) => term.length <= 40);
  return { normalized, terms: valid ? terms : [], valid };
};

const getEntries = (
  root: JCRNodeWrapper,
  current: string,
  panel: (node: JCRNodeWrapper) => NavigationPanel,
  cache: (node: JCRNodeWrapper) => void,
): Entry[] =>
  getChildNodes(
    root,
    -1,
    0,
    (node) =>
      node.isNodeType("jnt:page") ||
      node.isNodeType("jnt:navMenuText") ||
      node.isNodeType("jnt:nodeLink") ||
      node.isNodeType("jnt:externalLink"),
  )
    .map((node) => {
      try {
        if (!node.hasPermission("jcr:read")) return null;
        cache(node);
        // If the node is a menu entry, recursively get its children
        if (node.isNodeType("jnt:navMenuText")) {
          return {
            title: node.getDisplayableName(),
            children: getEntries(node, current, panel, cache),
            panel: panel(node),
          };
        }

        if (node.isNodeType("jnt:externalLink")) {
          const href = navigationUrl(
            node.hasProperty("j:url") ? node.getPropertyAsString("j:url") : undefined,
          );
          if (!href) return null;
          return {
            title: itemLabel(node),
            href,
            current: false,
            ...itemContent(node),
          };
        }

        // The node may be a page or a link to another node
        const target = node.isNodeType("jnt:nodeLink")
          ? node.hasProperty("j:node") && node.getProperty("j:node")?.getValue()?.getNode()
          : node;

        if (!target || !target.hasPermission("jcr:read")) return null;
        cache(target);

        return {
          title: itemLabel(node),
          href: buildNodeUrl(target)
            // Jahia only rewrites static HTML links in edit mode, fix the menu links
            // to work in edit mode as well
            .replace("/cms/edit/", "/cms/editframe/"),
          current: current === target.getIdentifier(),
          ...itemContent(node),
        };
      } catch {
        // Omit only the inaccessible entry, preserving the remaining menu.
        return null;
      }
    })
    .filter((entry) => entry !== null);

export default function NavBar({
  site,
  root,
  current,
  language,
}: {
  site: JCRSiteNode;
  root: JCRNodeWrapper;
  current: JCRNodeWrapper;
  language: string;
}) {
  const { renderContext } = useServerContext();
  const referencePage = (reference: JCRNodeWrapper, label?: string): Page | undefined => {
    try {
      if (!reference || !reference.hasPermission("jcr:read")) return;
      server.render.addCacheDependency({ path: reference.getPath() }, renderContext);
      const target = reference.isNodeType("jnt:nodeLink")
        ? reference.hasProperty("j:node") && reference.getProperty("j:node").getValue().getNode()
        : reference;
      if (!target || !target.hasPermission("jcr:read")) return;
      server.render.addCacheDependency({ path: target.getPath() }, renderContext);
      const href = navigationUrl(
        reference.isNodeType("jnt:externalLink")
          ? reference.getPropertyAsString("j:url")
          : buildNodeUrl(target).replace("/cms/edit/", "/cms/editframe/"),
      );
      return href
        ? {
            title: label || itemLabel(reference),
            href,
            current: current.getIdentifier() === target.getIdentifier(),
          }
        : undefined;
    } catch {
      // Optional weak references may point to removed content.
      return;
    }
  };
  const panelLink = (
    node: JCRNodeWrapper,
    property: "navFeatureLink",
    label: string | undefined,
  ) => {
    try {
      return node.hasProperty(property)
        ? referencePage(node.getProperty(property).getValue().getNode(), label)
        : undefined;
    } catch {
      return undefined;
    }
  };
  const panel = (node: JCRNodeWrapper): NavigationPanel => {
    const featureLink = panelLink(node, "navFeatureLink", text(node, "navFeatureLabel"));
    const columns = (["One", "Two"] as const).flatMap((column) => {
      const property = `navColumn${column}Links` as const;
      const title = text(node, `navColumn${column}Label`);
      if (!title || !node.hasProperty(property)) return [];
      const children = node
        .getProperty(property)
        .getValues()
        .flatMap((value): Page[] => {
          try {
            const reference = value.getNode();
            const page = referencePage(reference);
            return page ? [{ ...page, ...itemContent(reference) }] : [];
          } catch {
            return [];
          }
        });
      return children.length ? [{ title, children }] : [];
    });
    return {
      feature: featureLink
        ? {
            eyebrow: text(node, "navFeatureEyebrow"),
            heading: text(node, "navFeatureHeading") || featureLink.title,
            text: text(node, "navFeatureText"),
            link: featureLink,
          }
        : undefined,
      columns: columns.length ? columns : undefined,
    };
  };
  const utilityRoot = root.isNodeType("jahiacommix:homeUtilityNavigation") ? root : site;
  server.render.addCacheDependency({ path: utilityRoot.getPath() }, renderContext);
  const legacyUtilityEntries = (): Page[] =>
    utilityRoot.hasProperty("utilityNavigationLinks")
      ? utilityRoot
          .getProperty("utilityNavigationLinks")
          .getValues()
          .flatMap((value) => {
            try {
              const node = value.getNode();
              if (!node) return [];
              const page = referencePage(
                node,
                text(node, "navUtilityLabel") || node.getDisplayableName(),
              );
              return page ? [page] : [];
            } catch {
              // A weak reference may outlive a deleted navigation item.
              return [];
            }
          })
      : [];
  let utilityEntries: UtilityEntry[];
  try {
    const stored: unknown = root.hasProperty("utilityItemsData")
      ? JSON.parse(root.getPropertyAsString("utilityItemsData"))
      : undefined;
    utilityEntries = Array.isArray(stored)
      ? stored.flatMap((row): UtilityEntry[] => {
          try {
            if (!row || typeof row !== "object") return [];
            if (row.kind === "rss" || row.kind === "search" || row.kind === "languages")
              return [{ kind: row.kind }];
            if (row.kind === "internal" && typeof row.id === "string") {
              const reference = root.getSession().getNodeByIdentifier(row.id);
              if (!reference.hasPermission("jcr:read")) return [];
              const page = referencePage(reference, text(reference, "navUtilityLabel"));
              return page ? [page] : [];
            }
            if (row.kind !== "external" || typeof row.url !== "string") return [];
            const href = /^https?:\/\/[^\s/]+(?:[/?#][^\s]*)?$/i.test(row.url.trim())
              ? navigationUrl(row.url)
              : undefined;
            const title = row.labels?.[language] || row.labels?.en || row.labels?.fr;
            return href && typeof title === "string" && title.trim()
              ? [{ href, title: title.trim(), current: false }]
              : [];
          } catch {
            return [];
          }
        })
      : legacyUtilityEntries();
  } catch {
    utilityEntries = legacyUtilityEntries();
  }

  const buttonSource = root.isNodeType("jahiacommix:homeNavbarButtons") ? root : site;
  const buttons: NavbarButton[] = (["contact", "demo"] as const).flatMap((id) => {
    const prefix = id === "contact" ? "secondaryCTA" : "primaryCTA";
    const link = referenceLink(
      () =>
        buttonSource.hasProperty(`${prefix}Link`) &&
        buttonSource.getProperty(`${prefix}Link`).getValue().getNode(),
      (node) => buildNodeUrl(node),
      text(buttonSource, `${prefix}Label`),
    );
    if (!link) return [];
    return [
      {
        id,
        href: link.href,
        label: link.title,
        style:
          text(root, `${prefix}Style`) === "primary"
            ? "primary"
            : text(root, `${prefix}Style`) === "secondary"
              ? "secondary"
              : id === "contact"
                ? "secondary"
                : "primary",
        placement: text(root, `${prefix}Placement`) === "upper" ? "upper" : "main",
      },
    ];
  });
  if (text(root, "navbarCTAOrder") === "demoContact") buttons.reverse();
  const visible = (name: string) => !root.hasProperty(name) || root.getProperty(name).getBoolean();
  const label = (name: string, fallback: string) =>
    (root.hasProperty(name) && root.getPropertyAsString(name)?.trim()) || fallback;
  const controls: UtilityControls = {
    searchVisible: visible("utilitySearchVisible"),
    searchLabel: label("utilitySearchLabel", language === "fr" ? "Rechercher" : "Search"),
    languagesVisible: visible("utilityLanguagesVisible"),
    languagesLabel: label(
      "utilityLanguagesLabel",
      language === "fr" ? "Choisir la langue" : "Choose language",
    ),
  };
  server.render.addCacheDependency({ path: root.getPath() }, renderContext);
  const utilityTranslation = `j:translation_${language}`;
  if (root.hasNode(utilityTranslation))
    server.render.addCacheDependency(
      { path: root.getNode(utilityTranslation).getPath() },
      renderContext,
    );
  const rssPath = ["footer/iconsLeft/rss", "footer/iconsRight/rss"].find((path) =>
    site.hasNode(path),
  );
  const rssNode = rssPath ? site.getNode(rssPath) : undefined;
  if (rssNode) server.render.addCacheDependency({ path: rssNode.getPath() }, renderContext);
  const rssImage = referenceLink(
    () =>
      root.hasProperty("utilityRssImage") &&
      root.getProperty("utilityRssImage").getValue().getNode(),
    (image) => {
      server.render.addCacheDependency({ path: image.getPath() }, renderContext);
      return buildNodeUrl(image);
    },
  );
  const rssLabel = label("utilityRssLabel", language === "fr" ? "Flux RSS" : "RSS feed");
  const rssAddress = root.hasProperty("utilityRssVisible")
    ? root.hasProperty("utilityRssUrl")
      ? root.getPropertyAsString("utilityRssUrl")
      : ""
    : rssNode?.hasProperty("href")
      ? rssNode.getPropertyAsString("href")
      : undefined;
  const safeRssAddress = navigationUrl(rssAddress);
  const rss =
    visible("utilityRssVisible") && (rssNode || root.hasProperty("utilityRssVisible"))
      ? {
          href:
            safeRssAddress && /^(https?:\/\/|\/(?!\/))/i.test(safeRssAddress)
              ? safeRssAddress
              : undefined,
          label: rssLabel,
          pendingLabel: `${rssLabel} — ${language === "fr" ? "bientôt disponible" : "coming soon"}`,
          image: rssImage?.href,
        }
      : undefined;
  const invalidLanguages = new Set(
    current.hasProperty("j:invalidLanguages")
      ? current
          .getProperty("j:invalidLanguages")
          .getValues()
          .map((value) => value.getString())
      : [],
  );

  const langs = Object.entries(getSiteLocales())
    .filter(([language, locale]) => current.hasI18N(locale) && !invalidLanguages.has(language))
    .map(([language, locale]) => ({
      language,
      name: capitalize(locale.getDisplayLanguage(locale)),
      href: buildNodeUrl(current, { language }),
    }));
  const rawSearch = renderContext.getRequest().getParameter("search") || "";
  const requestedSearch = rawSearch.trim().length > 0;
  const parsedSearch = searchTerms(rawSearch);
  const fullText = parsedSearch.valid ? parsedSearch.terms.join(" ") : emptySearchTerm;
  const searchNodes = useJCRQuery({
    query: `
      SELECT * FROM [jmix:mainResource] AS result
      WHERE ISDESCENDANTNODE(result, ${JSON.stringify(site.getPath())})
      AND CONTAINS(result.*, '${fullText}')
      ORDER BY SCORE(result) DESC
    `,
  });
  const searchResults = searchNodes.slice(0, 20).map((node) => {
    server.render.addCacheDependency({ path: node.getPath() }, renderContext);
    return {
      url: buildNodeUrl(node, { language }),
      title: node.getDisplayableName(),
      snippet: node.hasProperty("jcr:description")
        ? node.getPropertyAsString("jcr:description").slice(0, 190)
        : "",
    };
  });
  const search = {
    query: parsedSearch.normalized.slice(0, 120),
    requested: requestedSearch,
    invalid: requestedSearch && !parsedSearch.valid,
    results: searchResults,
  };
  const searchPayload = encodeURIComponent(JSON.stringify(search));

  return (
    <>
      <Island
        component={NavBarClient}
        props={{
          // Menu CTAs
          buttons,
          // This can quickly get out of hand, if there are too many pages in the menu we need
          // to rethink the implementation
          entries: getEntries(root, current.getIdentifier(), panel, (node) =>
            server.render.addCacheDependency({ path: node.getPath() }, renderContext),
          ),
          utilityEntries,
          controls,
          rss,
          langs,
          language,
          search,
        }}
      >
        {root && (
          <a
            href={buildNodeUrl(root)}
            aria-current={current.getIdentifier() === root.getIdentifier() ? "page" : undefined}
            data-element-url={buildNodeUrl(root)}
            data-element-type="image"
            data-element-text="Jahia Logo"
            data-element-location="header"
            data-element-name={`nav/logo`}
          >
            <img src={buildModuleFileUrl(jahia)} alt="Jahia" width="70" height="32" />
          </a>
        )}
      </Island>
      <span hidden data-jahia-search-payload={searchPayload} />
      {langs.length > 1 && (
        <div
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {langs.map(({ name, href }) => (
            <a key={href} href={href} tabIndex={-1}>
              {name}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
