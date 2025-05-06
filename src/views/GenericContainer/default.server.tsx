import {
  AddContentButtons,
  getChildNodes,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import { Container, type ContainerProps } from "../../theme/index.js";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:genericContainer",
  },
  ({ columns, ...props }: { columns: "100" | "50-50" } & ContainerProps, { currentNode }) => (
    <Container {...props}>
      <div
        className={classes.grid}
        style={{
          gridTemplateColumns:
            { "50-50": "minmax(0, 1fr) minmax(0, 1fr)" }[columns as never] ?? "minmax(0, 1fr)",
        }}
      >
        {getChildNodes(currentNode, -1, 0, (node) => node.isNodeType("jnt:content")).map((node) => (
          <div key={node.getIdentifier()}>
            <Render node={node} />
          </div>
        ))}
        <AddContentButtons />
      </div>
    </Container>
  ),
);
