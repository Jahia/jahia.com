import {
  AddResources,
  buildModuleFileUrl,
  buildNodeUrl,
  jahiaComponent,
} from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import { safeUrl } from "../../security.js";
import RichText from "../../RichText.jsx";
import type { CardProps } from "./types.js";
import classes from "./component.module.css";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacardcarousel:card" },
  (props: CardProps) => {
    const { t } = useTranslation();
    const { "jcr:title": title, image, body, label } = props;
    const href = safeUrl(
      props["j:linkType"] === "internal"
        ? props["j:linknode"] && buildNodeUrl(props["j:linknode"])
        : props["j:linkType"] === "external"
          ? props["j:url"]
          : undefined,
    );
    return (
      <>
        <AddResources type="css" resources={buildModuleFileUrl("dist/assets/style.css")} />
        <article className={classes.card}>
          {image && image.hasPermission("jcr:read") && (
            <img
              className={classes.image}
              src={buildNodeUrl(image)}
              alt={image.getPropertyAsString("jcr:title") || ""}
              loading="lazy"
            />
          )}
          <div className={classes.body}>
            {title && <h3>{title}</h3>}
            <RichText html={body} />
            {href && (
              <a className={classes.link} href={href}>
                {label || t("cardCarousel.readMore")}
              </a>
            )}
          </div>
        </article>
      </>
    );
  },
);
