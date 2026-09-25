import { buildNodeUrl, jahiaComponent, server } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { Props } from "./types.js";
import { nodeModifiedAt } from "../../views/Glossary/updatedDate.js";
import Entry from "./Entry.jsx";
import { resolveGlossaryIndex } from "./indexPage.js";

// Resources use real node types and the existing pageType metadata. All other
// selected page families remain eligible, with the generic resource label.
const resourceKind = (node: JCRNodeWrapper) => {
  if (node.isNodeType("jahiacom:blogEntry")) return "article";
  const pageType = node.getPropertyAsString("pageType");
  if (pageType === "solution_page") return "solution";
  if (pageType === "case_study") return "customerStory";
  if (pageType === "whitepaper_page") return "whitepaper";
  if (pageType === "webinar_page") return "webinar";
  const path = node.getPath();
  if (path.includes("/home/solutions/")) return "solution";
  if (path.includes("/home/customer-stories/")) return "customerStory";
  if (path.includes("/infographics/")) return "infographic";
  return "resource";
};

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:glossaryEntry", name: "fullPage" },
  (
    { "jcr:title": title, resources = [], relatedTerms = [], ...props }: Props,
    { currentNode, currentResource, renderContext },
  ) => {
    const index = resolveGlossaryIndex(currentNode, (node) =>
      server.render.addCacheDependency({ path: node.getPath() }, renderContext),
    );
    const visibleReferences = (references: Array<JCRNodeWrapper | null>) => {
      const seen = new Set<string>([currentNode.getIdentifier()]);
      return references.filter((node): node is JCRNodeWrapper => {
        try {
          if (
            !node ||
            !node.hasPermission("jcr:read") ||
            !node.hasI18N(currentResource.getLocale())
          )
            return false;
          const id = node.getIdentifier();
          if (seen.has(id)) return false;
          seen.add(id);
          server.render.addCacheDependency({ path: node.getPath() }, renderContext);
          return true;
        } catch {
          // A deleted or inaccessible optional reference must not break the term.
          return false;
        }
      });
    };
    let updatedAt = nodeModifiedAt(currentNode);
    const translationName = `j:translation_${currentResource.getLocale().getLanguage()}`;
    if (currentNode.hasNode(translationName)) {
      const translation = currentNode.getNode(translationName);
      server.render.addCacheDependency({ path: translation.getPath() }, renderContext);
      updatedAt = Math.max(updatedAt, nodeModifiedAt(translation));
    }
    const updatedLabel = updatedAt
      ? new Intl.DateTimeFormat(currentResource.getLocale().getLanguage(), {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(updatedAt))
      : undefined;
    return (
      <Entry
        {...props}
        updatedLabel={updatedLabel}
        title={title || currentNode.getDisplayableName()}
        summary={props.summary || ""}
        indexUrl={index ? buildNodeUrl(index) : undefined}
        isEditMode={renderContext.isEditMode()}
        resources={visibleReferences(resources).map((node) => ({
          id: node.getIdentifier(),
          title: node.getDisplayableName(),
          url: buildNodeUrl(node),
          kind: resourceKind(node),
          description: node.getPropertyAsString("jcr:description") || undefined,
        }))}
        relatedTerms={visibleReferences(relatedTerms).map((node) => ({
          id: node.getIdentifier(),
          title: node.getDisplayableName(),
          url: buildNodeUrl(node),
          summary: node.getPropertyAsString("summary") || "",
          aliases: [],
        }))}
      />
    );
  },
);
