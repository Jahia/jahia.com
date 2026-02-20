import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:codeFile",
    name: "edit",
  },
  ({ contents }: { contents: string }, { currentNode }) => (
    <div style={{ background: "#fff", padding: "1rem" }}>
      <h4>File: {currentNode.getName()}</h4>
      <div dangerouslySetInnerHTML={{ __html: contents }} />
    </div>
  ),
);
