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
  navIcon?: "cms" | "dxp" | "ai";
  navUtilityLabel?: string;
};
export type NavigationPanelFields = {
  navLandingPage?: JCRNodeWrapper;
  navLandingLinkDisabled?: boolean;

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
  weight?: "bold" | "normal";
  id?: string;
  branchId?: string;
  depth?: number;
  title: string;
  href: string;
  current: boolean;
  icon?: string;
};
export type NavigationPanel = {
  treeColumns?: number;
  branchColumns?: Record<string, number>;
  branchOrder?: Record<string, string[]>;
  childOrder?: Record<string, string[]>;
  automatic?: boolean;

  landing?: Page;
  feature?: { eyebrow?: string; heading: string; text?: string; link: Page };
  columns?: Group[];
};
export type Group = {
  weight?: "bold" | "normal";
  icon?: string;
  id?: string;
  branchId?: string;
  depth?: number;
  title: string;
  children: Entry[];
  destination?: Page;
  panel?: NavigationPanel;
};
export type Entry = Group | Page;

export type AutomaticNavigationSettings = { navbarMode?: "legacy" | "automatic" };
export type AutomaticNavigationFields = {
  navExcluded?: boolean;
  navExpandChildren?: boolean;
  navAutoLabel?: string;
  navOtherLinksLabel?: string;
  navDiscoverVisible?: boolean;
  navDiscoverLabel?: string;
  navDiscoverPage?: JCRNodeWrapper;
};

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
