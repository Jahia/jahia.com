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
    name: "light",
  },
  ({ "jcr:title": title, body, image, swap, ...cta }: Props) => (
    <article className={classes.container}>
      <div className={clsx(classes.light, swap ? classes.left : classes.right)}>
        {image && <Image image={image} className={classes.lightImage} />}
        <div className="_stack-4" style={{ justifyContent: "start", padding: "3rem" }}>
          {title && <h3>{title}</h3>}
          {body && <div className="_richtext" dangerouslySetInnerHTML={{ __html: body }}></div>}
          {cta.ctaType !== "none" && (
            <p style={{ marginTop: "1rem", position: "relative", zIndex: 1 }}>
              <MixinCTA cta={cta} />
            </p>
          )}
        </div>
      </div>
    </article>
  ),
);
