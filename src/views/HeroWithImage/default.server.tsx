import { jahiaComponent } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import { Image } from "../../components/Image.jsx";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import classes from "./component.module.css";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithImage",
  },
  ({ "jcr:title": title, subtitle, image, theme, background, ...cta }: Props) => (
    <header
      className={classes.hero}
      data-theme={theme}
      data-bg={background}
      style={{ alignItems: "center" }}
    >
      <div className={classes.wrapper}>
        <div className={clsx(classes.title, "_stack-8")}>
          {title && <h1>{title}</h1>}
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
          {cta.ctaType !== "none" && (
            <p>
              <MixinCTA cta={cta} />
            </p>
          )}
        </div>
        {image && (
          // Despite being mandatory, the image can be missing in some cases (e.g. new translation)
          <Image image={image} className={classes.image} />
        )}
      </div>
    </header>
  ),
);
