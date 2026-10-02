import { buildNodeUrl, jahiaComponent, server } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import { linkedEditorialContent } from "./inlineTerms.server.js";
import Entry from "./Entry.jsx";
import { automaticLinks } from "./automaticLinks.server.js";
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
    const automatic = automaticLinks({ ...props, "jcr:title": title }, []);
    return (
      <Entry
        {...linked}
        editorialDateLabel={editorialDateLabel}
        title={title || currentNode.getDisplayableName()}
        summary={props.summary || ""}
        indexUrl={index ? buildNodeUrl(index) : undefined}
        isEditMode={renderContext.isEditMode()}
        resources={automatic.resources}
        relatedTerms={automatic.terms}
      />
    );
  },
);
