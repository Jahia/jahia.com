import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { clsx } from "clsx";
import type { Props } from "./types.js";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import { Image } from "../../components/Image.jsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithImage",
    name: "stack",
  },
  ({ theme, "jcr:title": title, subtitle, image, background, ...cta }: Props) => (
    <header className={classes.hero} data-theme={theme} data-bg={background}>
      <div className={clsx(classes.header, "_stack-8")}>
        <div className={"_stack-4"}>
          <h1>{title || "Title not defined"}</h1>
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
        </div>
        {cta.ctaType !== "none" && (
          <p>
            <MixinCTA cta={cta} />
          </p>
        )}
        {image && (
          // Despite being mandatory, the image can be missing in some cases (e.g. new translation)
          <Image image={image} style={{ width: "60rem", marginInline: "auto" }} />
        )}
      </div>
    </header>
  ),
);
