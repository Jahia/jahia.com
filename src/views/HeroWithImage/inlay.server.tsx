import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import Buttons from "../HeroWithoutImage/Buttons.jsx";
import classes from "./component.module.css";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithImage",
    name: "inlay",
  },
  (
    { "jcr:title": title, subtitle, image, imageCredit, theme, background, ...cta }: Props,
    { currentNode },
  ) => (
    <section className={classes.hero} data-theme={theme} data-bg={background}>
      <div
        className={classes.inlay}
        // @ts-expect-error CSS variable not supported in TS
        style={{ "--img": image && `url(${buildNodeUrl(image)})` }}
      >
        <h2>{title}</h2>
        <div className="_stack-4">
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
          <Buttons cta={cta} name={currentNode.getName()} location="inlay_banner" />
        </div>
      </div>
      {image && imageCredit && <p className={classes.inlayCredit}>{imageCredit}</p>}
    </section>
  ),
);
