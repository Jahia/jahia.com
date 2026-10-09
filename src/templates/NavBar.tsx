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
  NavigationItemFields,
  NavigationPanel,
  NavigationPanelFields,
  Page,
} from "./NavBar.types.js";
import cmsIcon from "../../static/icons/navigation/cms.png?no-inline";
import dxpIcon from "../../static/icons/navigation/dxp.png?no-inline";
import aiIcon from "../../static/icons/navigation/ai.svg?no-inline";
import { navigationUrl } from "./navigationUrl.js";

const icons = { cms: cmsIcon, dxp: dxpIcon, ai: aiIcon };
const text = (
  node: JCRNodeWrapper,
  property: keyof NavigationItemFields | keyof NavigationPanelFields,
) => (node.hasProperty(property) ? node.getPropertyAsString(property) : undefined);
const itemContent = (node: JCRNodeWrapper) => {
  const icon = text(node, "navIcon");
  return {
    description: text(node, "navDescription"),
    icon:
      icon && Object.hasOwn(icons, icon)
        ? buildModuleFileUrl(icons[icon as keyof typeof icons])
        : undefined,
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

      if (!target) return null;
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
      if (!reference) return;
      server.render.addCacheDependency({ path: reference.getPath() }, renderContext);
      const target = reference.isNodeType("jnt:nodeLink")
        ? reference.hasProperty("j:node") && reference.getProperty("j:node").getValue().getNode()
        : reference;
      if (!target) return;
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
    property: "navIntroLink" | "navFeatureLink",
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
    const introHeading = text(node, "navIntroHeading");
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
      intro: introHeading
        ? {
            eyebrow: text(node, "navIntroEyebrow"),
            heading: introHeading,
            text: text(node, "navIntroText"),
            link: panelLink(node, "navIntroLink", text(node, "navIntroLabel")),
          }
        : undefined,
      feature: featureLink
        ? {
            eyebrow: text(node, "navFeatureEyebrow"),
            heading: text(node, "navFeatureHeading") || featureLink.title,
            text: text(node, "navFeatureText"),
            link: featureLink,
          }
        : undefined,
      footerText: text(node, "navFooterText"),
      columns: columns.length ? columns : undefined,
    };
  };
  const utilityEntries: Page[] = site.hasProperty("utilityNavigationLinks")
    ? site
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
  const primaryCTALink =
    site.hasProperty("primaryCTALink") && site.getProperty("primaryCTALink").getValue().getNode();
  const secondaryCTALink =
    site.hasProperty("secondaryCTALink") &&
    site.getProperty("secondaryCTALink").getValue().getNode();
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
          primaryCTA: primaryCTALink && {
            href: buildNodeUrl(primaryCTALink),
            label:
              site.getPropertyAsString("primaryCTALabel") || primaryCTALink.getDisplayableName(),
          },
          secondaryCTA: secondaryCTALink && {
            href: buildNodeUrl(secondaryCTALink),
            label:
              site.getPropertyAsString("secondaryCTALabel") ||
              secondaryCTALink.getDisplayableName(),
          },
          // This can quickly get out of hand, if there are too many pages in the menu we need
          // to rethink the implementation
          entries: getEntries(root, current.getIdentifier(), panel, (node) =>
            server.render.addCacheDependency({ path: node.getPath() }, renderContext),
          ),
          utilityEntries,
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
