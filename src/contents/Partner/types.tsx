import clsx from "clsx";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";

// @ts-expect-error Duplicate declaration issue
export declare class Locale {
  constructor(lang: string, country: string);
  getDisplayCountry(locale: Locale): string;
}

// @ts-expect-error This is a Java class
export const Locale = Java.type("java.util.Locale");

export interface Props {
  "jcr:title": string;
  "certification": "silver" | "gold" | "diamond";
  "countries": string[];
  "description": string;
  "logo": JCRNodeWrapper;
}

const getMessage = (key: string, locale: Locale, defaultValue: string): string =>
  // @ts-expect-error This is a Java call
  Java.type("org.jahia.utils.i18n.Messages").get("resources.jahiacom", key, locale, defaultValue);

export const levels = (level: Props["certification"], locale: Locale) =>
  ({
    silver: (
      <>
        <span className={clsx("i-ri:star-fill", classes.silver)} />{" "}
        {getMessage("jahiacom_partner.certification.silver", locale, "Silver Partner")}
      </>
    ),
    gold: (
      <>
        <span className={clsx("i-ri:vip-crown-2-fill", classes.gold)} />{" "}
        {getMessage("jahiacom_partner.certification.gold", locale, "Gold Partner")}
      </>
    ),
    diamond: (
      <>
        <span className={clsx("i-ri:vip-diamond-fill", classes.diamond)} />{" "}
        {getMessage("jahiacom_partner.certification.diamond", locale, "Diamond Partner")}
      </>
    ),
  })[level];
