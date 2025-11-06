import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import classes from "./component.module.css";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithImage",
    name: "inlay",
  },
  ({ "jcr:title": title, subtitle, image, theme, background, ...cta }: Props) => (
    <section className={classes.hero} data-theme={theme} data-bg={background}>
      <div
        className={classes.inlay}
        // @ts-expect-error CSS variable not supported in TS
        style={{ "--img": image && `url(${buildNodeUrl(image)})` }}
      >
        <h2>{title}</h2>
        <div className="_stack-8">
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
          {cta.ctaType !== "none" && (
            <p>
              <MixinCTA cta={cta} />
            </p>
          )}
        </div>
      </div>
    </section>
  ),
);
