import { buildNodeUrl, getChildNodes } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./NavBar.module.css";

export default function NavBar({
  root,
  current,
}: {
  root: JCRNodeWrapper;
  current: JCRNodeWrapper;
}) {
  const link = (node: JCRNodeWrapper) => (
    <a
      className={classes.link}
      href={buildNodeUrl(node)}
      aria-current={current.getIdentifier() === node.getIdentifier() ? "page" : undefined}
    >
      {node.getProperty("jcr:title").getString()}
    </a>
  );

  return (
    <nav className={classes.nav}>
      {link(root)}
      <ul>
        {getChildNodes(root, -1, 0, (node) => node.isNodeType("jnt:page")).map((node) => (
          <li key={node.getIdentifier()}>
            {link(node)}
            <ul>
              {getChildNodes(node, -1, 0, (child) => child.isNodeType("jnt:page")).map((child) => (
                <li key={child.getIdentifier()}>{link(child)}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
