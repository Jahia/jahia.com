import type { JCRNodeWrapper } from "org.jahia.services.content";

export type NavigationItemFields = {
  navLabel?: string;
  navDescription?: string;
  navIcon?: "cms" | "dxp" | "ai";
  navUtilityLabel?: string;
};
export type NavigationPanelFields = {
  navIntroEyebrow?: string;
  navIntroHeading?: string;
  navIntroText?: string;
  navIntroLink?: JCRNodeWrapper;
  navIntroLabel?: string;
  navFeatureEyebrow?: string;
  navFeatureHeading?: string;
  navFeatureText?: string;
  navFeatureLink?: JCRNodeWrapper;
  navFeatureLabel?: string;
  navFooterText?: string;
  navColumnOneLabel?: string;
  navColumnOneLinks?: JCRNodeWrapper[];
  navColumnTwoLabel?: string;
  navColumnTwoLinks?: JCRNodeWrapper[];
};
export type Page = {
  title: string;
  href: string;
  current: boolean;
  description?: string;
  icon?: string;
};
export type NavigationPanel = {
  intro?: { eyebrow?: string; heading: string; text?: string; link?: Page };
  feature?: { eyebrow?: string; heading: string; text?: string; link: Page };
  footerText?: string;
  columns?: Group[];
};
export type Group = { title: string; children: Entry[]; panel?: NavigationPanel };
export type Entry = Group | Page;
