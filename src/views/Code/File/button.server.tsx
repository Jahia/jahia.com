import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:codeFile",
    name: "button",
  },
  ({ icon }: { icon: "jackrabbit" | "react" | "css" | "vite" }, { currentNode }) => (
    <label>
      <input
        type="radio"
        name={currentNode.getParent().getIdentifier()}
        // Check the first node by default
        checked={currentNode.getParent().getNodes().nextNode().getName() === currentNode.getName()}
        value={currentNode.getName()}
      />
      {
        {
          jackrabbit: <span className="i-custom:jackrabbit" />,
          react: <span className="i-ri:reactjs-line" />,
          css: <span className="i-simple-icons:css" />,
          vite: <span className="i-simple-icons:vite" />,
        }[icon]
      }
      {currentNode.getName()}
    </label>
  ),
);
