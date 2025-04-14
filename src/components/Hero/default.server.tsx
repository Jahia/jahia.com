import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";
import { clsx } from "clsx";

type Props = {
  "jcr:title"?: string;
  "subtitle"?: string;
  "image": JCRNodeWrapper;
  "ctaLabel"?: string;
} & ( // Reflect the three possible values of j:linkType
  | { "j:linkType": "none" }
  | { "j:linkType": "external"; "j:url": string; "j:linkTitle": string }
  | { "j:linkType": "internal"; "j:linknode": JCRNodeWrapper }
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:hero",
  },
  ({ "jcr:title": title, subtitle, image, ctaLabel, ...cta }: Props) =>
    cta["j:linkType"] === "none" ? (
      <header
        style={{ backgroundImage: `url(${buildNodeUrl(image)})` }}
        className={classes.hero}
        data-theme="night"
      >
        <div className={classes.column} style={{ textAlign: "center" }}>
          <h1>{title || "Title not defined"}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
    ) : (
      <header className={classes.hero} data-theme="night">
        <div className={clsx(classes.column, classes.grid)}>
          <div className={clsx(classes.wrapper, "_stack-4")}>
            <h1>{title || "Title not defined"}</h1>
            {subtitle && <p>{subtitle}</p>}
            <p>
              <a
                className={classes.cta}
                href={
                  cta["j:linkType"] === "internal" ? buildNodeUrl(cta["j:linknode"]) : cta["j:url"]
                }
                title={cta["j:linkType"] === "external" ? cta["j:linkTitle"] : undefined}
              >
                {ctaLabel ||
                  (cta["j:linkType"] === "internal"
                    ? cta["j:linknode"].getPropertyAsString("jcr:title")
                    : cta["j:linkTitle"])}
                <span className={classes.ctaLine} />
                <span className="i-ri:arrow-right-wide-line" />
              </a>
            </p>
          </div>
          <img
            src={buildNodeUrl(image)}
            alt={image.getPropertyAsString("jcr:title")}
            className={classes.image}
            width={image.getPropertyAsString("j:width")}
            height={image.getPropertyAsString("j:height")}
          />
        </div>
      </header>
    ),
);
