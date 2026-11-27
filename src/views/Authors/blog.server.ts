import { getNodesByJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { authorDirectoryPage } from "./folder.server.js";
import { sqlLiteral } from "./queries.js";

export function authorBlogPage(author: JCRNodeWrapper, depend: (node: JCRNodeWrapper) => void) {
  const sitePath = author.getPath().match(/^\/sites\/[^/]+/)?.[0];
  if (!sitePath) return;
  const session = author.getSession();
  const hostsBlogListing = (page: JCRNodeWrapper) => {
    if (!page.isNodeType("jnt:page") || !page.hasPermission("jcr:read")) return false;
    depend(page);
    const listings = getNodesByJCRQuery(
      session,
      "SELECT * FROM [jnt:contentFolderReference] AS n WHERE ISDESCENDANTNODE(n, " +
        sqlLiteral(page.getPath()) +
        ") AND n.[j:view] = 'blog'",
      30,
      0,
    );
    return listings.some((listing) => {
      let owner = listing.getParent() as JCRNodeWrapper;
      for (let level = 0; level < 16 && !owner.isNodeType("jnt:page"); level++)
        owner = owner.getParent() as JCRNodeWrapper;
      if (owner.getIdentifier() !== page.getIdentifier() || !listing.hasPermission("jcr:read"))
        return false;
      depend(listing);
      return true;
    });
  };

  const index = authorDirectoryPage(author, depend);
  let parent = index?.getParent() as JCRNodeWrapper | undefined;
  for (let depth = 0; depth < 12 && parent?.getPath().startsWith(sitePath + "/"); depth++) {
    if (hostsBlogListing(parent)) return parent;
    parent = parent.getParent() as JCRNodeWrapper;
  }

  const blogPath = sitePath + "/home/resources/blog";
  if (!session.nodeExists(blogPath)) return;
  const blog = session.getNode(blogPath) as JCRNodeWrapper;
  if (hostsBlogListing(blog)) return blog;
}
