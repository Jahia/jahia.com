import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import { CTA } from "../../mixins/CTA/index.jsx";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resource",
  },
  ({ "jcr:title": title, "jcr:description": description }: Props, { currentNode }) => {
    return (
      <div className={classes.card}>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        <p>
          <CTA href={buildNodeUrl(currentNode)} icon>
            View Resource
          </CTA>
        </p>
      </div>
    );
  },
);
