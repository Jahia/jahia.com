import { getChildNodes, jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import EditorHints from "../../components/EditorHints.jsx";
import { Container, type ContainerProps } from "../../theme/index.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:tiledGrid",
  },
  (props: ContainerProps, { currentNode }) => (
    <Container {...props}>
      <EditorHints
        title="Optimal number of items"
        hints={() => {
          const { length } = getChildNodes(currentNode, -1, 0, (node) =>
            node.isNodeType("jahiacom:tiledGridItem"),
          );
          // Help editors have the right number of items for all possible dispositions
          return {
            "On mobile": length >= 1,
            "On tablet": [0, 1].includes(length % 3),
            "On desktop": [0, 2].includes(length % 5),
          };
        }}
      >
        (Optimal for all formats: 7, 10, 12, 15)
      </EditorHints>
      <div className={classes.grid}>
        <RenderChildren />
      </div>
    </Container>
  ),
);
