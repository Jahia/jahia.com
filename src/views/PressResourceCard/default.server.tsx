import { buildNodeUrl, Island, jahiaComponent, server } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import { Image } from "../../components/Image.jsx";
import PressAction from "../PressItem/PressAction.jsx";
import classes from "./component.module.css";
import Copy from "./Copy.client.jsx";
import { useTranslation } from "react-i18next";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:pressResourceCard" },
  (
    {
      "jcr:title": title,
      description,
      formatLabel,
      visualLabel,
      image,
      document,
      isDownload,
      copyText,
      copyLabel,
      glassSurface,
      ...cta
    }: Props,
    { currentNode, renderContext },
  ) => {
    const { t } = useTranslation();
    const destination = cta.ctaType === "internal" ? cta["j:linknode"] : undefined;
    for (const node of [image, document, destination])
      if (node) server.render.addCacheDependency({ path: node.getPath() }, renderContext);
    const href = document
      ? buildNodeUrl(document)
      : destination
        ? buildNodeUrl(destination)
        : cta.ctaType === "external"
          ? cta["j:url"]
          : undefined;
    const actionLabel =
      ("ctaLabel" in cta && cta.ctaLabel) || (isDownload ? t("pressRoom.downloadKit") : undefined);
    return (
      <article
        id={currentNode.getName()}
        className={classes.resource}
        data-glass={glassSurface || undefined}
      >
        <div className={classes.header}>
          <h3>{title}</h3>
          {(image || visualLabel) && (
            <div className={classes.visual}>
              {image ? (
                <Image image={image} sizes={[96, 192]} width={96} style={{ height: "auto" }} />
              ) : (
                <span>{visualLabel}</span>
              )}
            </div>
          )}
        </div>
        {(formatLabel || description) && (
          <div className="_stack-4">
            {formatLabel && <p>{formatLabel}</p>}
            {description && <p>{description}</p>}
          </div>
        )}
        <div className={classes.actions}>
          {href && actionLabel && (
            <p>
              <PressAction
                href={href}
                label={actionLabel}
                name={currentNode.getName()}
                secondary={!("ctaVariant" in cta && cta.ctaVariant === "primary")}
                download={isDownload && (!!document || destination?.isNodeType("jnt:file"))}
              />
            </p>
          )}
          {copyText && copyLabel && (
            <Island component={Copy} props={{ text: copyText, label: copyLabel }} />
          )}
        </div>
      </article>
    );
  },
);
