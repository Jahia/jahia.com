import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Image } from "../../components/Image.jsx";
import { CTA } from "../../mixins/CTA/index.jsx";
import classes from "./component.module.css";
import {
  configuredRegions,
  countryNames,
  htmlToText,
  legacyRegion,
  levels,
  partnerLocations,
  regionCodes,
  regionCountries,
  type Props,
  type Region,
} from "./types.js";

export const PartnerCard = ({
  props,
  currentNode,
  locale,
  regionUrls,
}: {
  props: Props;
  currentNode: Parameters<typeof buildNodeUrl>[0];
  locale: InstanceType<typeof import("./types.js").Locale>;
  regionUrls?: Partial<Record<Region, string>>;
}) => {
  const { t } = useTranslation();
  const fallbackRegion = legacyRegion(currentNode);
  const regions = configuredRegions(props, fallbackRegion);
  const type = props.partnerType || "integrator";
  const url = buildNodeUrl(currentNode);
  const summary = props.shortDescription || htmlToText(props.description);
  const regionLinks = Object.fromEntries(
    regions.map((region) => [region, `${regionUrls?.[region] || url}?region=${region}`]),
  ) as Record<Region, string>;
  const defaultRegionLink = regionLinks[regions[0]];

  return (
    <article
      className={classes.card}
      data-partner-card=""
      data-partner-type={type}
      data-partner-regions={regions.join(",")}
    >
      <div className={classes.cardLogo}>
        {props.logo ? (
          <Image image={props.logo} sizes={[360, 720]} />
        ) : (
          <strong className={classes.logoName}>{props["jcr:title"]}</strong>
        )}
      </div>
      <div className={classes.cardHeading}>
        <h3>{props["jcr:title"]}</h3>
        <span className={clsx("_pack-1", classes.small)}>
          {levels(props.certification, locale)}
        </span>
      </div>
      <div className={classes.cardMeta}>
        <span className={classes.cardType}>
          {type === "technology" ? t("partner.technology") : t("partner.integrators")}
        </span>
        <div className={classes.locations}>
          {regions.map((region) => {
            const countries = countryNames(regionCountries(props, region), locale);
            if (!countries && regions.length === 1) return null;
            return (
              <span key={region}>
                <span className="i-ri:map-pin-2-line" />
                {regions.length > 1 && <strong>{regionCodes[region]}</strong>}
                {countries && `${regions.length > 1 ? " · " : ""}${countries}`}
              </span>
            );
          })}
        </div>
      </div>
      <p className={classes.summary}>{summary}</p>
      <div className={classes.cardActions}>
        <CTA
          href={defaultRegionLink}
          data-default-region-link={defaultRegionLink}
          data-region-links={JSON.stringify(regionLinks)}
          location="partners_directory"
          name={currentNode.getName()}
        >
          {t("partner.viewProfile")}
        </CTA>
      </div>
    </article>
  );
};

const SimilarPartnerCard = ({
  props,
  currentNode,
  locale,
  region,
}: {
  props: Props;
  currentNode: Parameters<typeof buildNodeUrl>[0];
  locale: InstanceType<typeof import("./types.js").Locale>;
  region: Region;
}) => {
  const { t } = useTranslation();
  const countries = countryNames(regionCountries(props, region), locale);
  return (
    <article className={classes.similarCard}>
      <div className={clsx(classes.similarLogo, !props.logo && classes.similarLogoFallback)}>
        {props.logo ? (
          <Image image={props.logo} sizes={[160, 320]} />
        ) : (
          <strong className={classes.logoName}>{props["jcr:title"]}</strong>
        )}
      </div>
      <h3>{props["jcr:title"]}</h3>
      <p>
        {countries || regionCodes[region]} · {levels(props.certification, locale)}
      </p>
      <a href={`${buildNodeUrl(currentNode)}?region=${region}`}>{t("partner.viewProfile")} →</a>
    </article>
  );
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:partner",
  },
  (props: Props, { currentNode, currentResource }) => {
    const locations = partnerLocations(currentNode);
    return (
      <PartnerCard
        props={locations.length ? { ...props, locations } : props}
        currentNode={currentNode}
        locale={currentResource.getLocale()}
      />
    );
  },
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:partner",
    name: "similarCard",
  },
  (props: Props, { currentNode, currentResource, renderContext }) => {
    const locations = partnerLocations(currentNode);
    const locationProps = locations.length ? { ...props, locations } : props;
    const regions = configuredRegions(locationProps, legacyRegion(currentNode));
    const requestedRegion = renderContext.getRequest().getParameter("region") as Region | null;
    const region =
      requestedRegion && regions.includes(requestedRegion) ? requestedRegion : regions[0];
    return (
      <SimilarPartnerCard
        props={locationProps}
        currentNode={currentNode}
        locale={currentResource.getLocale()}
        region={region}
      />
    );
  },
);
