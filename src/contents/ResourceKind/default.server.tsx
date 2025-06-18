import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resourceCategory",
  },
  ({ "jcr:title": title }, { currentNode }) => (
    <a className={classes.badge} href={buildNodeUrl(currentNode)}>
      {title}
    </a>
  ),
);
