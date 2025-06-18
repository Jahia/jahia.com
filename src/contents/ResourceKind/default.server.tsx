import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resourceKind",
  },
  ({ "jcr:title": title }) => <span className={classes.badge}>{title}</span>,
);
