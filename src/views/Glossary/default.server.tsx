import {
  buildNodeUrl,
  getChildNodes,
  Island,
  jahiaComponent,
  Render,
  server,
} from "@jahia/javascript-modules-library";
import { glossaryUpdatedLabel, nodeModifiedAt } from "./updatedDate.js";
import Glossary from "./Glossary.client.jsx";
import type { Props } from "./types.js";
import { glossaryEntries } from "./entries.server.js";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:glossary" },
  (
    {
      "jcr:title": title,
      entriesFolder,
      introduction,
      explanation,
      searchLabel,
      searchPlaceholder,
      searchHelp,
      showUnusedLetters,
    }: Props,
    { currentNode, currentResource, renderContext },
  ) => {
    const parent = entriesFolder || currentNode;
    server.render.addCacheDependency({ path: parent.getPath() }, renderContext);
    const nodes = getChildNodes(parent, -1, 0, (node) => node.isNodeType("jahiacom:glossaryEntry"));
    let latestUpdate = 0;
    const entries = glossaryEntries(parent).map((node) => {
      server.render.addCacheDependency({ path: node.getPath() }, renderContext);
      latestUpdate = Math.max(latestUpdate, nodeModifiedAt(node));
      const translationName = `j:translation_${currentResource.getLocale().getLanguage()}`;
      if (node.hasNode(translationName)) {
        const translation = node.getNode(translationName);
        server.render.addCacheDependency({ path: translation.getPath() }, renderContext);
        latestUpdate = Math.max(latestUpdate, nodeModifiedAt(translation));
      }
      return {
        id: node.getIdentifier(),
        title:
          node.getPropertyAsString("indexLabel") ||
          node.getPropertyAsString("jcr:title") ||
          node.getName(),
        summary: node.getPropertyAsString("summary") || "",
        aliases: [
          node.getPropertyAsString("jcr:title") || "",
          ...(node.hasProperty("aliases")
            ? Array.from(node.getProperty("aliases").getValues(), (value) => value.getString())
            : []),
        ],
        url: buildNodeUrl(node),
      };
    });
    const isEditMode = renderContext.isEditMode();
    return (
      <Island
        component={Glossary}
        props={{
          introduction,
          searchLabel,
          searchPlaceholder,
          searchHelp,
          showUnusedLetters: showUnusedLetters === true,
          explanation,
          updatedLabel: glossaryUpdatedLabel(
            latestUpdate,
            currentResource.getLocale().getLanguage(),
          ),
          id: `glossary-${currentNode.getIdentifier()}`,
          title: title || currentNode.getDisplayableName(),
          entries,
          isEditMode,
        }}
      >
        {isEditMode &&
          nodes.map((node) => <Render key={node.getIdentifier()} node={node} readOnly />)}
      </Island>
    );
  },
);
