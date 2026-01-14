import { getChildNodes, jahiaComponent, Render } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:listChildren",
  },
  ({ parent, type, view }: { parent?: string; type: string; view: string }, { jcrSession }) => (
    <>
      {parent &&
        getChildNodes(jcrSession.getNode(parent), -1, 0, (node) => node.isNodeType(type)).map(
          (node) => <Render key={node.getIdentifier()} node={node} view={view} />,
        )}
    </>
  ),
);
