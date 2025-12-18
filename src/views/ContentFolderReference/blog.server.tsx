import { jahiaComponent, Render } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./styles.module.css";

interface Props {
  "j:node"?: JCRNodeWrapper;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jnt:contentFolderReference",
    name: "blog",
  },
  ({ "j:node": node }: Props, { renderContext }) => (
    <div className={clsx(renderContext.isEditMode() || classes.grid)}>
      <Render node={node} />
    </div>
  ),
);
