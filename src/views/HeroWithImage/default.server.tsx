import { jahiaComponent } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import { CreditedImage } from "../../components/CreditedImage.jsx";
import { CTA } from "../../mixins/CTA/index.jsx";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import classes from "./component.module.css";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithImage",
  },
  (
    {
      "jcr:title": title,
      subtitle,
      image,
      imageCredit,
      secondaryCTALabel,
      secondaryCTAUrl,
      theme,
      background,
      ...cta
    }: Props,
    { currentNode },
  ) => (
    <header
      className={classes.hero}
      data-theme={theme}
      data-bg={background}
      style={{ alignItems: "center", padding: 0 }}
    >
      <div className={classes.wrapper}>
        <div className={clsx(classes.title, "_stack-8")}>
          {title && <h1>{title}</h1>}
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
          {(cta.ctaType !== "none" || (secondaryCTALabel && secondaryCTAUrl)) && (
            <p className={classes.actions}>
              {cta.ctaType !== "none" && (
                <MixinCTA cta={cta} location="hero_banner" name={currentNode.getName()} />
              )}
              {secondaryCTALabel && secondaryCTAUrl && (
                <CTA
                  href={secondaryCTAUrl}
                  secondary
                  location="hero_banner"
                  name={`${currentNode.getName()}-secondary`}
                >
                  {secondaryCTALabel}
                </CTA>
              )}
            </p>
          )}
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
  ),
);
