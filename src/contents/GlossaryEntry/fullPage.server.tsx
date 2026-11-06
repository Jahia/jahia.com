import { buildNodeUrl, jahiaComponent, server } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import { linkedEditorialContent } from "./inlineTerms.server.js";
import { manualResources } from "./manualResources.server.js";
import { selectedFaqItems } from "./faqItems.server.js";
import Entry from "./Entry.jsx";
import { resolveGlossaryIndex } from "./indexPage.js";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:glossaryEntry", name: "fullPage" },
  ({ "jcr:title": title, ...props }: Props, { currentNode, currentResource, renderContext }) => {
    const index = resolveGlossaryIndex(currentNode, (node) =>
      server.render.addCacheDependency({ path: node.getPath() }, renderContext),
    );
    const editorialTimestamp = currentNode.hasProperty("editorialDate")
      ? Date.parse(currentNode.getPropertyAsString("editorialDate"))
      : 0;
    const editorialDateLabel = editorialTimestamp
      ? new Intl.DateTimeFormat(currentResource.getLocale().getLanguage(), {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(editorialTimestamp))
      : undefined;
    const linked = linkedEditorialContent(props);
    const selected = manualResources(
      props.resources,
      currentNode,
      currentResource.getLocale(),
      (node) => server.render.addCacheDependency({ path: node.getPath() }, renderContext),
    );
    return (
      <Entry
        {...linked}
        faqItems={selectedFaqItems(currentNode)}
        editorialDateLabel={editorialDateLabel}
        title={title || currentNode.getDisplayableName()}
        summary={props.summary || ""}
        indexUrl={index ? buildNodeUrl(index) : undefined}
        isEditMode={renderContext.isEditMode()}
        resources={selected}
        resourceEndpoint={
          !renderContext.isEditMode() &&
          !props.resources?.length &&
          props.autoLinks === true &&
          !props.mergedInto
            ? buildNodeUrl(currentNode, { extension: ".suggestions.html" })
            : undefined
        }
      />
    );
  },
);
