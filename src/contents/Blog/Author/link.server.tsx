import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:blogAuthor", name: "link" },
  ({ name }, { currentNode }) => <a href={buildNodeUrl(currentNode)}>{name}</a>,
);
