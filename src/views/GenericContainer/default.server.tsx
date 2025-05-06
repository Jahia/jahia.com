import {
  AddContentButtons,
  getChildNodes,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import { Container, type ContainerProps } from "../../theme/index.js";
import classes from "./component.module.css";

type Columns = "100" | "50-50" | "67-33" | "33-67" | "33-33-33" | "25-25-25-25";
type Width = "100" | "75" | "50";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:genericContainer",
  },
  (
    { columns, width, ...props }: { columns: Columns; width: Width } & ContainerProps,
    { currentNode },
  ) => (
    <Container {...props}>
      <div className={classes.grid} data-columns={columns} data-width={width}>
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
