import { jahiaComponent } from "@jahia/javascript-modules-library";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import classes from "./styles.module.css";
import { Image } from "../../components/Image.jsx";
import type { Props } from "./types.js";
import clsx from "clsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:testimony",
    name: "cover",
  },
  ({ author, quote, image, theme, ...cta }: Props, { currentNode }) => (
    <section
      id={currentNode.getName()}
      className={clsx(classes.container, classes.cover)}
      data-theme={theme}
    >
      {image && <Image image={image} className={classes.image} />}
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
