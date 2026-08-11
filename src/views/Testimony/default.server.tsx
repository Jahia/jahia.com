import { jahiaComponent } from "@jahia/javascript-modules-library";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import classes from "./styles.module.css";
import { CreditedImage } from "../../components/CreditedImage.jsx";
import type { Props } from "./types.js";
import clsx from "clsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:testimony",
  },
  ({ author, quote, image, imageCredit, theme, ...cta }: Props, { currentNode }) => (
    <section id={currentNode.getName()} className={clsx(classes.container)} data-theme={theme}>
      <div className={classes.testimony}>
        {image && (
          <CreditedImage
            image={image}
            credit={imageCredit}
            className={classes.image}
            figureClassName={classes.imageFigure}
          />
        )}
        <div className={classes.text}>
          <div className="_richtext">
            <blockquote dangerouslySetInnerHTML={{ __html: quote }}></blockquote>
          </div>
          {author && <p>— {author}</p>}
          {cta.ctaType !== "none" && (
            <p>
              <MixinCTA cta={cta} location="testimonials_section" name={currentNode.getName()} />
            </p>
          )}
        </div>
      </div>
    </section>
  ),
);
