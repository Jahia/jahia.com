import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { clsx } from "clsx";
import type { Props } from "./types.js";
import { MixinCTA } from "../../mixins/CTA/server.jsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:hero",
    name: "stack",
  },
  ({ theme, "jcr:title": title, subtitle, image, background, ...cta }: Props) => (
    <header className={classes.hero} data-theme={theme} data-bg={background}>
      <div className={clsx(classes.header, "_stack-8")}>
        <div className={"_stack-4"}>
          <h1>{title || "Title not defined"}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {cta.ctaType !== "none" && (
          <p>
            <MixinCTA cta={cta} />
          </p>
        )}
        {image && (
          // Despite being mandatory, the image can be missing in some cases (e.g. new translation)
          <img
            src={buildNodeUrl(image)}
            alt={image.getPropertyAsString("jcr:title")}
            width={image.getPropertyAsString("j:width")}
            height={image.getPropertyAsString("j:height")}
            style={{ width: "60rem", marginInline: "auto" }}
          />
        )}
      </div>
    </header>
  ),
);
