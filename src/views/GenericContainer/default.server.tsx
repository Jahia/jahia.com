import {
  AddContentButtons,
  getChildNodes,
  jahiaComponent,
  Render,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:genericContainer",
  },
  (
    { theme, columns }: { theme: "day" | "cloudy" | "night"; columns: "100" | "50-50" },
    { currentNode },
  ) => (
    <section className={classes.container} data-theme={theme}>
      <div style={{ gridTemplateColumns: { "50-50": "1fr 1fr" }[columns as never] ?? "1fr" }}>
        {getChildNodes(currentNode, -1, 0, (node) => node.isNodeType("jnt:content")).map((node) => (
          <div key={node.getIdentifier()}>
            <Render node={node} />
          </div>
        ))}
        <AddContentButtons />
      </div>
    </section>
  ),
);
