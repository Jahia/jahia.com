import type { JCRNodeWrapper } from "org.jahia.services.content";

export type UtilityTool = "rss" | "search" | "languages";
export type UtilityEntry = Page | { kind: UtilityTool };
export type UtilityControls = {
  searchVisible: boolean;
  searchLabel: string;
  languagesVisible: boolean;
  languagesLabel: string;
};

export type NavigationItemFields = {
  navLabel?: string;
  navDescription?: string;
  navIconImage?: JCRNodeWrapper;
  navUtilityLabel?: string;
};
export type NavigationPanelFields = {
  navFeatureEyebrow?: string;
  navFeatureHeading?: string;
  navFeatureText?: string;
  navFeatureLink?: JCRNodeWrapper;
  navFeatureLabel?: string;
  navColumnOneLabel?: string;
  navColumnOneLinks?: JCRNodeWrapper[];
  navColumnTwoLabel?: string;
  navColumnTwoLinks?: JCRNodeWrapper[];
};
export type Page = {
  title: string;
  href: string;
  current: boolean;
  icon?: string;
};
export type NavigationPanel = {
  feature?: { eyebrow?: string; heading: string; text?: string; link: Page };
  columns?: Group[];
};
export type Group = { title: string; children: Entry[]; panel?: NavigationPanel };
export type Entry = Group | Page;

export type HomeNavbarButtonFields = {
  primaryCTALink?: JCRNodeWrapper;
  primaryCTALabel?: string;
  primaryCTAStyle?: "primary" | "secondary";
  primaryCTAPlacement?: "main" | "upper";
  secondaryCTALink?: JCRNodeWrapper;
  secondaryCTALabel?: string;
  secondaryCTAStyle?: "primary" | "secondary";
  secondaryCTAPlacement?: "main" | "upper";
  navbarCTAOrder?: "contactDemo" | "demoContact";
};
export type NavbarButton = {
  id: "contact" | "demo";
  href: string;
  label: string;
  style: "primary" | "secondary";
  placement: "main" | "upper";
};
