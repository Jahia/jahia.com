import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";
import clsx from "clsx";
import type { Props as CardProps } from "../Card/types.js";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import { CreditedImage } from "../../components/CreditedImage.jsx";

export type Props = CardProps & {
  image?: JCRNodeWrapper;
  imageCredit?: string;
  swap?: boolean;
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:panel",
    name: "light",
  },
  ({ "jcr:title": title, body, image, imageCredit, swap, ...cta }: Props, { currentNode }) => (
    <article className={classes.container}>
      <div className={clsx(classes.light, swap ? classes.left : classes.right)}>
        {image && (
          <CreditedImage
            image={image}
            credit={imageCredit}
            className={classes.lightImage}
            figureClassName={classes.lightFigure}
          />
        )}
        <div className="_stack-2" style={{ justifyContent: "center" }}>
          {title && <h3>{title}</h3>}
          {body && <div className="_richtext" dangerouslySetInnerHTML={{ __html: body }}></div>}
          {cta.ctaType !== "none" && (
            <p style={{ marginTop: "1rem" }}>
              <MixinCTA cta={cta} location="panel" name={currentNode.getName()} />
            </p>
          )}
        </div>
      </div>
    </article>
  ),
);
