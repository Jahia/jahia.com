import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { clsx } from "clsx";
import type { Props } from "./types.js";
import Buttons from "../HeroWithoutImage/Buttons.jsx";
import { CreditedImage } from "../../components/CreditedImage.jsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithImage",
    name: "compact",
  },
  (
    { theme, "jcr:title": title, subtitle, image, imageCredit, background, ...cta }: Props,
    { currentNode },
  ) => (
    <header className={classes.hero} data-theme={theme} data-bg={background}>
      <div className={classes.grid}>
        <div className={clsx(classes.compact, "_stack-4")}>
          {title && <h1>{title}</h1>}
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
          <Buttons cta={cta} name={currentNode.getName()} location="hero_banner" />
        </div>
        {image && (
          // Despite being mandatory, the image can be missing in some cases (e.g. new translation)
          <CreditedImage
            image={image}
            credit={imageCredit}
            className={classes.compactImage}
            figureClassName={classes.compactFigure}
          />
        )}
      </div>
    </header>
  ),
);
