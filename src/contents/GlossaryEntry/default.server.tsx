import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { TermRow } from "../../views/Glossary/Glossary.client.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:glossaryEntry" },
  (
    { "jcr:title": title, indexLabel, mergedInto, summary, aliases = [] }: Props,
    { currentNode },
  ) =>
    mergedInto ? null : (
      <TermRow
        entry={{
          id: currentNode.getIdentifier(),
          title: indexLabel || title || currentNode.getDisplayableName(),
          summary: summary || "",
          aliases,
          url: buildNodeUrl(currentNode),
        }}
      />
    ),
);
