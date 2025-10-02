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

export const levels = {
  silver: (
    <>
      <span className={clsx("i-ri:triangle-fill", classes.silver)} /> Silver Partner
    </>
  ),
  gold: (
    <>
      <span className={clsx("i-ri:circle-fill", classes.gold)} /> Gold Partner
    </>
  ),
  diamond: (
    <>
      <span className={clsx("i-ri:vip-diamond-fill", classes.diamond)} /> Diamond Partner
    </>
  ),
};
