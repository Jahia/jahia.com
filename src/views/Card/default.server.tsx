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
import { glossaryUpdatedLabel, nodeModifiedAt } from "../Glossary/updatedDate.js";
import { termLetter } from "../Glossary/model.js";
import { htmlToText } from "../../contents/Partner/types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:card",
  },
  (
    {
      "jcr:title": title,
      body,
      icon,
      partnerRegionTarget,
      glossaryMetric,
      glossaryFolder,
      ...cta
    }: Props,
    { currentNode, currentResource, renderContext },
  ) => {
    const { t } = useTranslation();
    let metricValue: string | number | undefined;
    if (glossaryMetric && glossaryMetric !== "none" && glossaryFolder) {
      server.render.addCacheDependency({ path: glossaryFolder.getPath() }, renderContext);
      const locale = currentResource.getLocale();
      const language = locale.getLanguage();
      const entries = getChildNodes(glossaryFolder, -1, 0, (node) =>
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
        glossaryMetric === "entries"
          ? entries.length
          : glossaryMetric === "letters"
            ? new Set(
                entries.map((node) =>
                  termLetter(node.getPropertyAsString("jcr:title") || node.getName()),
                ),
              ).size
            : glossaryUpdatedLabel(updatedAt, language);
    }
    // Old region cards stored a generated count in rich text. Keep other editorial copy.
    const legacyRegionCount =
      partnerRegionTarget && /^\d+\s+part(?:ner|enaire)s?$/i.test(htmlToText(body || "").trim());
    return (
      <article className={classes.card}>
        {icon && (
          <img
            loading="lazy"
            src={`${buildNodeUrl(icon)}?w=96&h=96`}
            alt={icon.getPropertyAsString("jcr:title")}
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
          <h3>{title}</h3>
        ) : null}
        {body && !legacyRegionCount && (
          <div
            className="_richtext"
            style={{ flex: 1, marginBottom: "1rem" }}
            dangerouslySetInnerHTML={{ __html: body }}
          />
        )}
        {partnerRegionTarget && <p data-partner-region-count={partnerRegionTarget} />}
        {partnerRegionTarget ? (
          <p style={{ marginTop: "1rem" }}>
            <CTA
              href="#partner-directory"
              data-partner-region-target={partnerRegionTarget}
              icon="i-ri:arrow-right-s-line"
              secondary
              location="partner_regions"
              name={currentNode.getName()}
            >
              {t("partner.viewPartners")}
            </CTA>
          </p>
        ) : cta.ctaType !== "none" ? (
          <p style={{ marginTop: "1rem" }}>
            <MixinCTA cta={cta} location="card" name={currentNode.getName()} />
          </p>
        ) : null}
      </article>
    );
  },
);
