import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resourceCategory",
  },
  ({ "jcr:title": title, icon }: Props, { currentNode }) => (
    <a className={classes.badge} href={buildNodeUrl(currentNode)}>
      {icon && <img src={buildNodeUrl(icon)} alt="" width="16" height="16" />}
      {title}
    </a>
  ),
);
