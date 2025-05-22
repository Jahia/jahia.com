import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { LinkTypeCTA, type LinkTypeProps } from "../../LinkTypeCTA.jsx";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";
import clsx from "clsx";

type Props = (LinkTypeProps | { ctaType: "none" }) & {
  "jcr:title"?: string;
  "body"?: string;
  "image"?: JCRNodeWrapper;
  "swap"?: boolean;
};

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:panel" },
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
          <img
            src={buildNodeUrl(image)}
            alt={image.getPropertyAsString("jcr:title")}
            width={image.getPropertyAsString("j:width")}
            height={image.getPropertyAsString("j:height")}
          />
        </div>
      )}
      <div className={classes.text}>
        <h3>{title}</h3>
        {body && <div className="_richtext" dangerouslySetInnerHTML={{ __html: body }}></div>}
        {cta.ctaType !== "none" && (
          <p>
            <LinkTypeCTA cta={cta} />
          </p>
        )}
      </div>
    </article>
  ),
);
