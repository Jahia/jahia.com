import { jahiaComponent } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import { CreditedImage } from "../../components/CreditedImage.jsx";
import Buttons from "../HeroWithoutImage/Buttons.jsx";
import classes from "./component.module.css";
import type { Props } from "./types.js";

function renderHero(
  { "jcr:title": title, subtitle, image, imageCredit, theme, background, ...cta }: Props,
  name: string,
  insetImage = false,
) {
  return (
    <header
      className={clsx(classes.hero, insetImage && classes.insetImage)}
      data-theme={theme}
      data-bg={background}
      style={{ alignItems: "center", padding: 0 }}
    >
      <div className={classes.wrapper}>
        <div className={clsx(classes.title, "_stack-8")}>
          {title && <h1>{title}</h1>}
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
          <Buttons cta={cta} name={name} location="hero_banner" />
        </div>
        {image && (
          // Despite being mandatory, the image can be missing in some cases (e.g. new translation)
          <CreditedImage
            image={image}
            credit={imageCredit}
            className={classes.image}
            figureClassName={classes.imageFigure}
          />
        )}
      </div>
    </header>
  );
}

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:heroWithImage" },
  (props: Props, { currentNode }) => renderHero(props, currentNode.getName()),
);

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:heroWithImage", name: "insetImage" },
  (props: Props, { currentNode }) => renderHero(props, currentNode.getName(), true),
);
