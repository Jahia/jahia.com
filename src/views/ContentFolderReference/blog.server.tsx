import { jahiaComponent, Render, server, useJCRQuery } from "@jahia/javascript-modules-library";
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
  ({ "j:node": folder }: Props, { renderContext }) => {
    // Jahia only registers cache dependencies on the entries rendered below, so an entry that did
    // not exist yet when this fragment was cached cannot flush it: publishing a new blog post left
    // the list stale until eviction. Depending on the folder subtree flushes it on any addition.
    if (folder) {
      server.render.addCacheDependency(
        { flushOnPathMatchingRegexp: `${folder.getPath()}/.*` },
        renderContext,
      );
    }

    return (
      <div className={clsx(renderContext.isEditMode() || classes.grid)}>
        {folder &&
          useJCRQuery({
            query: `
            SELECT * FROM [jahiacom:blogEntry]
            WHERE ISDESCENDANTNODE(${JSON.stringify(folder.getPath())})
            ORDER BY [date] DESC
          `,
          }).map((entry) => <Render key={entry.getIdentifier()} node={entry} />)}
      </div>
    );
  },
);
