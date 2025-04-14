import {
  buildModuleFileUrl,
  buildNodeUrl,
  getChildNodes,
  HydrateInBrowser,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import NavBarClient from "./NavBar.client.jsx";

export default function NavBar({
  root,
  current,
}: {
  root: JCRNodeWrapper;
  current: JCRNodeWrapper;
}) {
  return (
    <HydrateInBrowser
      child={NavBarClient}
      props={{
        // This can quickly get out of hand, if there are too many pages in the menu we need
        // to rethink the implementation
        pages: getChildNodes(root, -1, 0, (node) => node.isNodeType("jnt:page")).map((node) => ({
          href: buildNodeUrl(node),
          current: current.getIdentifier() === node.getIdentifier(),
          title: node.getPropertyAsString("jcr:title"),
          children: getChildNodes(node, -1, 0, (child) => child.isNodeType("jnt:page")).map(
            (child) => ({
              href: buildNodeUrl(child),
              current: current.getIdentifier() === child.getIdentifier(),
              title: child.getPropertyAsString("jcr:title"),
            }),
          ),
        })),
      }}
    >
      <a
        href={buildNodeUrl(root)}
        aria-current={current.getIdentifier() === root.getIdentifier() ? "page" : undefined}
      >
        <img
          src={buildModuleFileUrl("static/logos/jahia-light.svg")}
          alt="Jahia"
          width="90"
          height="40"
        />
      </a>
    </HydrateInBrowser>
  );
}
