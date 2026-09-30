import { buildNodeUrl, jahiaComponent, server } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import { nodeModifiedAt } from "../../views/Glossary/updatedDate.js";
import Entry from "./Entry.jsx";
import { automaticLinks } from "./automaticLinks.server.js";
import { resolveGlossaryIndex } from "./indexPage.js";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:glossaryEntry", name: "fullPage" },
  ({ "jcr:title": title, ...props }: Props, { currentNode, currentResource, renderContext }) => {
    const index = resolveGlossaryIndex(currentNode, (node) =>
      server.render.addCacheDependency({ path: node.getPath() }, renderContext),
    );
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
    const automatic = automaticLinks({ ...props, "jcr:title": title }, []);
    return (
      <Entry
        {...props}
        updatedLabel={updatedLabel}
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
