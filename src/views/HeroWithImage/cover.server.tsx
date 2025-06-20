import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { Props } from "./types.js";
import clsx from "clsx";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import { Image } from "../../components/Image.jsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithImage",
    name: "cover",
  },
  ({ theme, "jcr:title": title, subtitle, image, ...cta }: Props) => (
    <header className={classes.cover} data-theme={theme}>
      {image && <Image image={image} fetchPriority="high" className={classes.background} />}
      <div className={clsx(classes.header, "_stack-4")}>
        <h1>{title || "Title not defined"}</h1>
        {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
        {cta.ctaType !== "none" && (
          <p>
            <MixinCTA cta={cta} />
          </p>
        )}
      </div>
    </header>
  ),
);
