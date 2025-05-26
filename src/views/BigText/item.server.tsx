import { jahiaComponent } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jnt:bigText",
    name: "item",
  },
  ({ text }) => (
    <div className={clsx("_richtext", classes.item)} dangerouslySetInnerHTML={{ __html: text }} />
  ),
);
