import {
  getChildNodes,
  Island,
  jahiaComponent,
  Render,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import Code from "./Code.client.jsx";
import classes from "./styles.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:code",
  },
  (_, { renderContext, currentNode }) => (
    <div className={classes.container}>
      {renderContext.isEditMode() ? (
        <RenderChildren view="edit" />
      ) : (
        <Island component={Code}>
          <div className={classes.tabs}>
            <RenderChildren view="button" />
          </div>
          {getChildNodes(currentNode, -1, 0, (node) => node.isNodeType("jnt:content")).map(
            (node, i) => (
              <div
                key={node.getName()}
                data-name={node.getName()}
                hidden={i > 0}
                className={classes.panel}
              >
                <Render node={node} />
              </div>
            ),
          )}
        </Island>
      )}
    </div>
  ),
);
