import {
  AddContentButtons,
  getChildNodes,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { ThemeProps } from "../../theme.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:genericContainer",
  },
  ({ theme, background, columns }: { columns: "100" | "50-50" } & ThemeProps, { currentNode }) => (
    <section className={classes.container} data-theme={theme} data-bg={background}>
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
