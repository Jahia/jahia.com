import { classificationOf, type PartnerClassification } from "./classification.js";
export { classificationOf } from "./classification.js";
import clsx from "clsx";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";

// @ts-expect-error Duplicate declaration issue
export declare class Locale {
  constructor(lang: string, country: string);
  getDisplayCountry(locale: Locale): string;
  getLanguage(): string;
}

// @ts-expect-error This is a Java class
export const Locale = Java.type("java.util.Locale");
// Resolved on first use, not at module evaluation: a failing `Java.type` during the engine's
// init script leaves a pooled GraalVM context without any of this module's views.
let Messages:
  | { get: (bundle: string, key: string, locale: Locale, defaultValue: string) => string }
  | undefined;

export interface Props {
  "jcr:title": string;
  "partnerClassification"?: PartnerClassification;
  "description": string;
  "logo"?: JCRNodeWrapper;
  "heroSubtitle"?: string;
  "shortDescription"?: string;
  "website"?: string;
  "partnerSince"?: string;
  "partnerLocationsData"?: string;
  "tags"?: Array<JCRNodeWrapper | null>;
  "aboutTitle"?: string;
  "expertiseTitle"?: string;
  "expertiseBody"?: string;
  "partnership"?: string;
  "partnershipImage"?: JCRNodeWrapper;
  "certifiedConsultants"?: number;
  "scope"?: string;
  "testimonialsData"?: string;
  "htmlTitle"?: string;
  "seoDescription"?: string;
  "seoKeywords"?: string[];
  "openGraphImage"?: JCRNodeWrapper;
  "jsonLd"?: string[];
}

export type Region = "europe" | "americas" | "apac";

export interface PartnerLocation {
  region: Region;
  country?: string;
}

export const regionCodes: Record<Region, string> = {
  europe: "EU",
  americas: "USA",
  apac: "APAC",
};

const isRegion = (value: string): value is Region =>
  value === "europe" || value === "americas" || value === "apac";

export const compositePartnerLocations = (value?: string): PartnerLocation[] => {
  if (!value?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry): PartnerLocation[] => {
      if (!entry || typeof entry !== "object") return [];
      const region = "region" in entry ? entry.region : undefined;
      const country = "country" in entry ? entry.country : undefined;
      if (typeof region !== "string" || !isRegion(region)) return [];
      return [
        {
          region,
          country: typeof country === "string" && country.trim() ? country.trim() : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
};

export const legacyRegion = (node: JCRNodeWrapper): Region => {
  const context = node.getParent().getPath().toLowerCase();
  if (context.includes("america") || context.includes("amérique")) return "americas";
  if (context.includes("asia") || context.includes("asie") || context.includes("apac"))
    return "apac";
  return "europe";
};

export const regionCountries = (
  props: Pick<Props, "partnerLocationsData">,
  region: Region,
): string[] => {
  return compositePartnerLocations(props.partnerLocationsData)
    .filter((location) => location.region === region)
    .map((location) => location.country || "")
    .filter(Boolean);
};

export const configuredRegions = (
  props: Pick<Props, "partnerLocationsData">,
  fallbackRegion: Region = "europe",
): Region[] => {
  const compositeRegions = compositePartnerLocations(props.partnerLocationsData).map(
    ({ region }) => region,
  );
  if (compositeRegions.length) return [...new Set(compositeRegions)];

  return [fallbackRegion];
};

export const countryNames = (countries: string[], locale: Locale) =>
  countries
    .filter((country) => country.trim().toUpperCase() !== "ZZ")
    .map((country) => {
      const value = country.trim();
      return /^[A-Za-z]{2}$/.test(value)
        ? new Locale(locale.getLanguage(), value.toUpperCase()).getDisplayCountry(locale)
        : value;
    })
    .filter(Boolean)
    .join(", ");

const htmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  quot: '"',
  nbsp: " ",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  agrave: "à",
  acirc: "â",
  icirc: "î",
  ocirc: "ô",
  ugrave: "ù",
  ucirc: "û",
  ccedil: "ç",
  oelig: "œ",
  rsquo: "’",
  laquo: "«",
  raquo: "»",
};

export const htmlToText = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 16)),
    )
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(Number.parseInt(value, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => htmlEntities[name.toLowerCase()] || entity)
    .replace(/\s+/g, " ")
    .trim();

const getMessage = (key: string, locale: Locale, defaultValue: string): string => {
  try {
    // @ts-expect-error This is a Java call
    Messages ??= Java.type("org.jahia.utils.i18n.Messages");
    return Messages!.get("resources.jahiacom", key, locale, defaultValue);
  } catch {
    return defaultValue;
  }
};

const levels = (classification: PartnerClassification | undefined, locale: Locale) => {
  const value = classificationOf(classification);
  if (!value) return null;
  if (value.partnership)
    return (
      <span className={classes.level}>
        {getMessage(
          `jahiacom_partner.badge.${value.partnership}`,
          locale,
          value.partnership === "strategic" ? "Strategic partner" : "Integration partner",
        )}
      </span>
    );
  return {
    silver: (
      <span className={classes.level}>
        <span className={clsx("i-ri:star-fill", classes.silver)} aria-hidden="true" />
        <span>{getMessage("jahiacom_partner.badge.silver", locale, "Silver Partner")}</span>
      </span>
    ),
    gold: (
      <span className={classes.level}>
        <span className={clsx("i-ri:vip-crown-2-fill", classes.gold)} aria-hidden="true" />
        <span>{getMessage("jahiacom_partner.badge.gold", locale, "Gold Partner")}</span>
      </span>
    ),
    diamond: (
      <span className={classes.level}>
        <svg className={classes.diamond} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M4.878 3.003h14.254a1 1 0 0 1 .809.412l3.822 5.256a.5.5 0 0 1-.037.633l-11.354 12.3a.5.5 0 0 1-.735 0L.283 9.305a.5.5 0 0 1-.037-.633l3.823-5.256a1 1 0 0 1 .809-.412"
          />
          <path
            className={classes.diamondFacets}
            d="M1.5 9h21M8 3.8 6.5 9 12 20.5 17.5 9 16 3.8M8 3.8 12 9l4-5.2"
            fill="none"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
        </svg>
        <span>{getMessage("jahiacom_partner.badge.diamond", locale, "Diamond Partner")}</span>
      </span>
    ),
  }[value.level!];
};

export const PartnerBadge = ({ props, locale }: { props: Props; locale: Locale }) => (
  <span
    className={clsx(
      classes.small,
      classificationOf(props.partnerClassification)?.partnership === "strategic" &&
        classes.strategic,
    )}
    data-partner-badge=""
  >
    {levels(props.partnerClassification, locale)}
  </span>
);
