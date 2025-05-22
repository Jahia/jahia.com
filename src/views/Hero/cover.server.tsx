import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { Props } from "./types.js";
import { LinkTypeCTA } from "../LinkTypeCTA.jsx";
import clsx from "clsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:hero",
    name: "cover",
  },
  ({ theme, "jcr:title": title, subtitle, image, ...cta }: Props) => (
    <>
      {image && <link rel="preload" as="image" href={buildNodeUrl(image)} />}
      <header
        // Despite being mandatory, the image can be missing in some cases (e.g. new translation)
        style={{ backgroundImage: image && `url(${buildNodeUrl(image)})`, paddingBlock: "4rem" }}
        className={classes.hero}
        data-theme={theme}
      >
        <div className={clsx(classes.header, "_stack-4")}>
          <h1>{title || "Title not defined"}</h1>
          {subtitle && <p>{subtitle}</p>}
          {cta.ctaType !== "none" && (
            <p>
              <LinkTypeCTA cta={cta} />
            </p>
          )}
        </div>
      </header>
    </>
  ),
);
