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
    <article
      className={clsx(
        classes.panel,
        image ? classes.withImage : classes.withoutImage,
        swap ? classes.left : classes.right,
      )}
    >
      {image && (
        <div className={classes.image}>
          <Image image={image} />
        </div>
      )}
      <div className={classes.text}>
        <h3>{title}</h3>
        {body && <div className="_richtext" dangerouslySetInnerHTML={{ __html: body }}></div>}
        {cta.ctaType !== "none" && (
          <p>
            <MixinCTA cta={cta} />
          </p>
        )}
      </div>
    </article>
  ),
);
