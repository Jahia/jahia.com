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
    priority: 1,
  },
  ({ "jcr:title": title, body, image, imageCredit, swap, ...cta }: Props, { currentNode }) => (
    <article className={classes.container}>
      <div className={clsx(classes.panel, swap ? classes.left : classes.right)}>
        {image && (
          <div className={classes.image}>
            <CreditedImage image={image} credit={imageCredit} />
          </div>
        )}
        <div className={classes.text}>
          {title && <h3>{title}</h3>}
          {body && (
            <div
              className="_richtext"
              style={{ flex: 1 }}
              dangerouslySetInnerHTML={{ __html: body }}
            />
          )}
          {cta.ctaType !== "none" && (
            <p>
              <MixinCTA cta={cta} location="panel" name={currentNode.getName()} />
            </p>
          )}
        </div>
      </div>
    </article>
  ),
);
