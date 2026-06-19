import { jahiaComponent, Render, useJCRQuery } from "@jahia/javascript-modules-library";
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
  ({ "j:node": folder }: Props, { renderContext }) => (
    <div className={clsx(renderContext.isEditMode() || classes.grid)}>
      {folder &&
        useJCRQuery({
          query: `
            SELECT * FROM [jahiacom:blogEntry]
            WHERE ISDESCENDANTNODE(${JSON.stringify(folder.getPath())})
            ORDER BY [date] DESC
          `,
        }).map((entry) => <Render key={entry.getIdentifier()} node={entry} view="previewBlog"/>)}
    </div>
  ),
);
