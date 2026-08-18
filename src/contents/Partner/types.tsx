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
// @ts-expect-error This is a Java call
const Messages = Java.type("org.jahia.utils.i18n.Messages");

export interface Props {
  "jcr:title": string;
  "certification": "silver" | "gold" | "diamond";
  "description": string;
  "logo"?: JCRNodeWrapper;
  "partnerType"?: "integrator" | "technology";
  "partnerLevel"?: string;
  "integrationPartner"?: boolean;
  "shortDescription"?: string;
  "website"?: string;
  "partnerSince"?: string;
  "countries"?: string[];
  "regions"?: Region[];
  "locationCountries"?: string[];
  "partnerLocationsData"?: string;
  "tags"?: Array<JCRNodeWrapper | null>;
  "aboutTitle"?: string;
  "expertiseTitle"?: string;
  "expertise"?: string[];
  "partnership"?: string;
  "certifiedConsultants"?: number;
  "scope"?: string;
  "quote"?: string;
  "quoteAuthor"?: string;
  "quoteAuthorTitle"?: string;
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
  props: Pick<Props, "partnerLocationsData" | "regions" | "locationCountries" | "countries">,
  region: Region,
): string[] => {
  const compositeLocations = compositePartnerLocations(props.partnerLocationsData);
  if (compositeLocations.length) {
    return compositeLocations
      .filter((location) => location.region === region)
      .map((location) => location.country || "")
      .filter(Boolean);
  }

  const locationIndex = props.regions?.indexOf(region) ?? -1;
  const freeTextCountry =
    locationIndex >= 0 ? props.locationCountries?.[locationIndex]?.trim() : undefined;
  if (freeTextCountry) return [freeTextCountry];
  if (locationIndex >= 0 && props.locationCountries !== undefined) return [];

  if (props.regions?.length) return props.countries || [];

  return props.countries || [];
};

export const configuredRegions = (props: Props, fallbackRegion: Region = "europe"): Region[] => {
  const compositeRegions = compositePartnerLocations(props.partnerLocationsData).map(
    ({ region }) => region,
  );
  if (compositeRegions.length) return [...new Set(compositeRegions)];

  if (props.regions?.length) return [...new Set(props.regions)];

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

const getMessage = (key: string, locale: Locale, defaultValue: string): string =>
  Messages.get("resources.jahiacom", key, locale, defaultValue);

export const levels = (
  level: Props["certification"],
  locale: Locale,
  partnerLevel?: Props["partnerLevel"],
  integrationPartner?: Props["integrationPartner"],
) =>
  integrationPartner ? (
    <span className={classes.level}>
      {getMessage("jahiacom_partner.integrationPartner", locale, "Integration partner")}
    </span>
  ) : partnerLevel?.trim() ? (
    <span className={classes.level}>{partnerLevel.trim()}</span>
  ) : (
    {
      silver: (
        <span className={classes.level}>
          <span className={clsx("i-ri:star-fill", classes.silver)} aria-hidden="true" />
          <span>
            {getMessage("jahiacom_partner.certification.silver", locale, "Silver Partner")}
          </span>
        </span>
      ),
      gold: (
        <span className={classes.level}>
          <span className={clsx("i-ri:vip-crown-2-fill", classes.gold)} aria-hidden="true" />
          <span>{getMessage("jahiacom_partner.certification.gold", locale, "Gold Partner")}</span>
        </span>
      ),
      diamond: (
        <span className={classes.level}>
          <span className={clsx("i-ri:vip-diamond-fill", classes.diamond)} aria-hidden="true" />
          <span>
            {getMessage("jahiacom_partner.certification.diamond", locale, "Diamond Partner")}
          </span>
        </span>
      ),
    }[level]
  );
