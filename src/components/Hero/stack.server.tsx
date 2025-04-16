import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { clsx } from "clsx";
import { CTA } from "./CTA.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:hero",
    name: "stack",
  },
  ({ "jcr:title": title, subtitle, image, ...cta }: Props) => (
    <header className={classes.hero} data-theme="night">
      <div className={clsx(classes.column, classes.center, "_stack-8")}>
        <div className={"_stack-4"}>
          <h1>{title || "Title not defined"}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {cta["j:linkType"] !== "none" && (
          <p>
            <CTA cta={cta} />
          </p>
        )}
        {image && (
          // Despite being mandatory, the image can be missing in some cases (e.g. new translation)
          <img
            src={buildNodeUrl(image)}
            alt={image.getPropertyAsString("jcr:title")}
            width={image.getPropertyAsString("j:width")}
            height={image.getPropertyAsString("j:height")}
            style={{ maxWidth: "60rem", marginInline: "auto" }}
          />
        )}
      </div>
    </header>
  ),
);
