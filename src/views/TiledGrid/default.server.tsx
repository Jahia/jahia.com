import { getChildNodes, jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import EditorHints from "../../components/EditorHints.jsx";
import type { ThemeProps } from "../../theme.js";

type Props = ThemeProps & {
  "jcr:title"?: string;
  "subtitle"?: string;
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:tiledGrid",
  },
  ({ theme, "jcr:title": title, subtitle }: Props, { currentNode }) => (
    <section className={classes.container} data-theme={theme}>
      <header className={classes.header}>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
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
    </section>
  ),
);
