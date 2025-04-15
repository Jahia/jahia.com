import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { Props } from "./types.js";
import { CTA } from "./CTA.jsx";
import clsx from "clsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:hero",
    name: "cover",
  },
  ({ "jcr:title": title, subtitle, image, ...cta }: Props) => (
    <header
      style={{ backgroundImage: `url(${buildNodeUrl(image)})`, paddingBlock: "4rem" }}
      className={classes.hero}
      data-theme="night"
    >
      <div className={clsx(classes.column, "_stack-4")} style={{ textAlign: "center" }}>
        <h1>{title || "Title not defined"}</h1>
        {subtitle && <p>{subtitle}</p>}
        {cta["j:linkType"] !== "none" && (
          <p>
            <CTA cta={cta} />
          </p>
        )}
      </div>
    </header>
  ),
);
