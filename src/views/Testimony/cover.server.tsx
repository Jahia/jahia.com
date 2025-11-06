import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import classes from "./styles.module.css";
import type { Props } from "./types.js";
import clsx from "clsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:testimony",
    name: "cover",
  },
  ({ author, quote, image, theme, ...cta }: Props) => (
    <section
      className={clsx(classes.container, classes.cover)}
      data-theme={theme}
      style={{ backgroundImage: image && `url("${buildNodeUrl(image)}")` }}
    >
      <div className={classes.text}>
        <div className="_richtext">
          <blockquote dangerouslySetInnerHTML={{ __html: quote }}></blockquote>
        </div>
        {author && <p>— {author}</p>}
        {cta.ctaType !== "none" && (
          <p>
            <MixinCTA cta={cta} />
          </p>
        )}
      </div>
    </section>
  ),
);
