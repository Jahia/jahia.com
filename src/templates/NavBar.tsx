import {
  // buildModuleFileUrl,
  buildNodeUrl,
  getChildNodes,
  HydrateInBrowser,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { JCRSiteNode } from "org.jahia.services.content.decorator";
// import jahia from "./jahia-light.svg?no-inline";
import NavBarClient, { type Entry } from "./NavBar.client.jsx";

const getEntries = (root: JCRNodeWrapper, current: string): Entry[] =>
  getChildNodes(
    root,
    -1,
    0,
    (node) =>
      node.isNodeType("jnt:page") ||
      node.isNodeType("jnt:navMenuText") ||
      node.isNodeType("jnt:nodeLink"),
  ).map((node) => {
    // If the node is a menu entry, recursively get its children
    if (node.isNodeType("jnt:navMenuText"))
      return {
        title: node.getPropertyAsString("jcr:title"),
        children: getEntries(node, current),
      };

    // The node may be a page or a link to another node
    const target = node.isNodeType("jnt:nodeLink")
      ? node.getProperty("j:node").getValue().getNode()
      : node;

    return {
      title: node.getPropertyAsString("jcr:title"),
      href: buildNodeUrl(target),
      current: current === target.getIdentifier(),
    };
  });

export default function NavBar({
  site,
  root,
  current,
}: {
  site: JCRSiteNode;
  root: JCRNodeWrapper;
  current: JCRNodeWrapper;
}) {
  const primaryCTALink =
    site.hasProperty("primaryCTALink") && site.getProperty("primaryCTALink").getValue().getNode();
  const secondaryCTALink =
    site.hasProperty("secondaryCTALink") &&
    site.getProperty("secondaryCTALink").getValue().getNode();

  return (
    <HydrateInBrowser
      child={NavBarClient}
      props={{
        // Menu CTAs
        primaryCTA: primaryCTALink && {
          href: buildNodeUrl(primaryCTALink),
          label:
            site.getPropertyAsString("primaryCTALabel") ||
            primaryCTALink.getPropertyAsString("jcr:title"),
        },
        secondaryCTA: secondaryCTALink && {
          href: buildNodeUrl(secondaryCTALink),
          label:
            site.getPropertyAsString("secondaryCTALabel") ||
            secondaryCTALink.getPropertyAsString("jcr:title"),
        },
        // This can quickly get out of hand, if there are too many pages in the menu we need
        // to rethink the implementation
        entries: getEntries(root, current.getIdentifier()),
      }}
    >
      <a
        href={buildNodeUrl(root)}
        aria-current={current.getIdentifier() === root.getIdentifier() ? "page" : undefined}
      >
        {/* <img src={buildModuleFileUrl(jahia)} alt="Jahia" width="90" height="40" /> */}
        TODO: coder le menu
      </a>
    </HydrateInBrowser>
  );
}
