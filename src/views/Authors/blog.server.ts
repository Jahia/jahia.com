import { getNodesByJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { authorDirectoryPage } from "./folder.server.js";
import { sqlLiteral } from "./queries.js";

/** Resolve the blog through the configured directory's actual page hierarchy. */
export function authorBlogPage(author: JCRNodeWrapper, depend: (node: JCRNodeWrapper) => void) {
  const index = authorDirectoryPage(author, depend);
  if (!index) return;
  const sitePath = author.getPath().match(/^\/sites\/[^/]+/)?.[0];
  let parent = index.getParent() as JCRNodeWrapper;
  for (let depth = 0; depth < 12 && parent.getPath().startsWith(sitePath + "/"); depth++) {
    if (parent.isNodeType("jnt:page") && parent.hasPermission("jcr:read")) {
      depend(parent);
      const listings = getNodesByJCRQuery(
        parent.getSession(),
        "SELECT * FROM [jnt:contentFolderReference] AS n WHERE ISDESCENDANTNODE(n, " +
          sqlLiteral(parent.getPath()) +
          ") AND n.[j:view] = 'blog'",
        30,
        0,
      );
      for (const listing of listings) {
        let owner = listing.getParent() as JCRNodeWrapper;
        for (let level = 0; level < 16 && !owner.isNodeType("jnt:page"); level++)
          owner = owner.getParent() as JCRNodeWrapper;
        if (owner.getIdentifier() === parent.getIdentifier() && listing.hasPermission("jcr:read")) {
          depend(listing);
          return parent;
        }
      }
    }
    parent = parent.getParent() as JCRNodeWrapper;
  }
}
