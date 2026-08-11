import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { Props } from "./types.js";
import clsx from "clsx";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import { CreditedImage } from "../../components/CreditedImage.jsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithImage",
    name: "cover",
  },
  ({ theme, "jcr:title": title, subtitle, image, imageCredit, ...cta }: Props, { currentNode }) => (
    <header className={classes.cover} data-theme={theme}>
      {image && (
        <CreditedImage
          image={image}
          credit={imageCredit}
          fetchPriority="high"
          className={classes.background}
          figureClassName={classes.backgroundFigure}
          overlayCredit
        />
      )}
      <div className={clsx(classes.header, "_stack-4")}>
        {title && <h1>{title}</h1>}
        {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
        {cta.ctaType !== "none" && (
          <p>
            <MixinCTA cta={cta} location="hero_banner" name={currentNode.getName()} />
          </p>
        )}
      </div>
    </header>
  ),
);
