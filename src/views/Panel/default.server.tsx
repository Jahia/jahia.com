import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";
import clsx from "clsx";
import type { Props as CardProps } from "../Card/types.js";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import { Image } from "../../components/Image.jsx";

export type Props = CardProps & {
  image?: JCRNodeWrapper;
  swap?: boolean;
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:panel",
    priority: 1,
  },
  ({ "jcr:title": title, body, image, swap, ...cta }: Props) => (
    <article className={classes.container}>
      <div className={clsx(classes.panel, swap ? classes.left : classes.right)}>
        {image && (
          <div className={classes.image}>
            <Image image={image} />
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
              <MixinCTA cta={cta} />
            </p>
          )}
        </div>
      </div>
    </article>
  ),
);
