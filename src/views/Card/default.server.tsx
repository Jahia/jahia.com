import {
  buildNodeUrl,
  getChildNodes,
  jahiaComponent,
  server,
} from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import classes from "./component.module.css";
import { CTA } from "../../mixins/CTA/index.jsx";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import type { Props } from "./types.js";
import { navigationUrl } from "../../templates/navigationUrl.js";
import { glossaryUpdatedLabel, nodeModifiedAt } from "../Glossary/updatedDate.js";
import { termLetter } from "../Glossary/model.js";
import { htmlToText } from "../../contents/Partner/types.js";
import CardMedia from "../../components/CardMedia.jsx";

export const Card = jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:card",
  },
  (
    {
      "jcr:title": title,
      body,
      icon,
      image,
      background,
      cardPurpose,
      partnerRegionTarget,
      glossaryMetric,
      glossaryFolder,
      "regionTarget": configuredRegion,
      "metric": configuredMetric,
      "entriesFolder": configuredFolder,
      cardTheme,
      hideCtaIcon,
      compact = false,
      ...cta
    }: Props & { compact?: boolean },
    { currentNode, currentResource, renderContext },
  ) => {
    const { t } = useTranslation();
    const purpose = currentNode.hasProperty("cardPurpose")
      ? cardPurpose
      : partnerRegionTarget
        ? "partnerRegion"
        : glossaryMetric && glossaryMetric !== "none"
          ? "glossaryStatistic"
          : cardPurpose;
    const regionTarget =
      purpose === "partnerRegion" ? (configuredRegion ?? partnerRegionTarget) : undefined;
    const metric = configuredMetric ?? glossaryMetric;
    const entriesFolder = configuredFolder ?? glossaryFolder;
    let metricValue: string | number | undefined;
    if (purpose === "glossaryStatistic" && metric && entriesFolder) {
      server.render.addCacheDependency({ path: entriesFolder.getPath() }, renderContext);
      const locale = currentResource.getLocale();
      const language = locale.getLanguage();
      const entries = getChildNodes(entriesFolder, -1, 0, (node) =>
        node.isNodeType("jahiacom:glossaryEntry"),
      ).filter(
        (node) =>
          node.hasPermission("jcr:read") &&
          node.hasI18N(locale) &&
          (!node.hasProperty("j:invalidLanguages") ||
            !Array.from(node.getProperty("j:invalidLanguages").getValues(), (value) =>
              value.getString(),
            ).includes(language)),
      );
      let updatedAt = 0;
      for (const node of entries) {
        server.render.addCacheDependency({ path: node.getPath() }, renderContext);
        updatedAt = Math.max(updatedAt, nodeModifiedAt(node));
        const translationName = `j:translation_${language}`;
        if (node.hasNode(translationName)) {
          const translation = node.getNode(translationName);
          server.render.addCacheDependency({ path: translation.getPath() }, renderContext);
          updatedAt = Math.max(updatedAt, nodeModifiedAt(translation));
        }
      }
      metricValue =
        metric === "entries"
          ? entries.length
          : metric === "letters"
            ? new Set(
                entries.map((node) =>
                  termLetter(node.getPropertyAsString("jcr:title") || node.getName()),
                ),
              ).size
            : glossaryUpdatedLabel(updatedAt, language);
    }
    // Old region cards stored a generated count in rich text. Keep other editorial copy.
    const legacyRegionCount =
      regionTarget && /^\d+\s+part(?:ner|enaire)s?$/i.test(htmlToText(body || "").trim());
    const cardHref = compact
      ? navigationUrl(
          cta.ctaType === "internal"
            ? cta["j:linknode"] && buildNodeUrl(cta["j:linknode"])
            : cta.ctaType === "external"
              ? cta["j:url"]
              : undefined,
        )
      : undefined;
    const hasMedia = Boolean(image || cardTheme || background);
    const content = (
      <>
        {icon && (
          <img
            loading="lazy"
            src={`${buildNodeUrl(icon)}?w=96&h=96`}
            alt={icon.getPropertyAsString("jcr:title") || ""}
            width="48"
            height="48"
            style={{ marginTop: "-0.5rem" }}
          />
        )}
        {metricValue !== undefined ? (
          <>
            <h3>{metricValue}</h3>
            {title && <p>{title}</p>}
          </>
        ) : title ? (
          <h3>
            {cardHref ? (
              <a
                href={cardHref}
                data-element-url={cardHref}
                data-element-type="link"
                data-element-text={title}
                data-element-location="card"
                data-element-name={currentNode.getName()}
              >
                {title}
              </a>
            ) : (
              title
            )}
          </h3>
        ) : null}
        {body && !legacyRegionCount && (
          <div
            className="_richtext"
            style={compact ? undefined : { flex: 1, marginBottom: "1rem" }}
            dangerouslySetInnerHTML={{ __html: body }}
          />
        )}
        {regionTarget && <p data-partner-region-count={regionTarget} />}
        {regionTarget ? (
          <p style={{ marginTop: compact ? 0 : "1rem" }}>
            <CTA
              href="#partner-directory"
              data-partner-region-target={regionTarget}
              icon="i-ri:arrow-right-s-line"
              secondary
              location="partner_regions"
              name={currentNode.getName()}
            >
              {t("partner.viewPartners")}
            </CTA>
          </p>
        ) : !compact && cta.ctaType !== "none" ? (
          <p style={{ marginTop: compact ? 0 : "1rem" }}>
            <MixinCTA cta={cta} location="card" name={currentNode.getName()} icon={!hideCtaIcon} />
          </p>
        ) : null}
      </>
    );
    return (
      <article
        className={`${classes.card}${hasMedia ? ` ${classes.withMedia}` : ""}${compact ? ` ${classes.compact}` : ""}`}
        data-theme={hasMedia ? "day" : undefined}
      >
        {hasMedia && <CardMedia image={image} theme={cardTheme} background={background} />}
        {hasMedia ? <div className={classes.body}>{content}</div> : content}
      </article>
    );
  },
);
