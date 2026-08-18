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
import jahia from "./jahia-light.svg?no-inline";
import NavBarClient, { type Entry } from "./NavBar.client.jsx";

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

const getEntries = (root: JCRNodeWrapper, current: string): Entry[] =>
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
      // If the node is a menu entry, recursively get its children
      if (node.isNodeType("jnt:navMenuText")) {
        return {
          title: node.getDisplayableName(),
          children: getEntries(node, current),
        };
      }

      if (node.isNodeType("jnt:externalLink")) {
        return {
          title: node.getDisplayableName(),
          href: node.hasProperty("j:url") ? node.getPropertyAsString("j:url") : "",
          current: false,
        };
      }

      // The node may be a page or a link to another node
      const target = node.isNodeType("jnt:nodeLink")
        ? node.hasProperty("j:node") && node.getProperty("j:node")?.getValue()?.getNode()
        : node;

      if (!target) return null;

      return {
        title: node.getDisplayableName(),
        href: buildNodeUrl(target)
          // Jahia only rewrites static HTML links in edit mode, fix the menu links
          // to work in edit mode as well
          .replace("/cms/edit/", "/cms/editframe/"),
        current: current === target.getIdentifier(),
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
          entries: getEntries(root, current.getIdentifier()),
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
            <img
              loading="lazy"
              src={buildModuleFileUrl(jahia)}
              alt="Jahia"
              width="90"
              height="40"
            />
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
