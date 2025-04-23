import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

interface Props {
  "jcr:title"?: string;
  "subtitle"?: string;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:tiledGrid",
  },
  ({ "jcr:title": title, subtitle }: Props) => (
    <section>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      <div className={classes.grid}>
        <RenderChildren />
      </div>
    </section>
  ),
);
