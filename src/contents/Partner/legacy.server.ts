import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { Props } from "./types.js";
// Read existing repository values only. No persistence or cross-environment data transfer.
export const partnerIdentity = (node: JCRNodeWrapper) => {
  const text = (name: string) =>
    node.hasProperty(name) ? node.getPropertyAsString(name) : undefined;
  const list = (name: string) =>
    node.hasProperty(name)
      ? Array.from(node.getProperty(name).getValues(), (v) => v.getString())
      : undefined;
  return {
    partnerClassification: text("partnerClassification") as Props["partnerClassification"],
    partnerType: text("partnerType") as Props["partnerType"],
    certification: text("certification") as Props["certification"],
    partnerLevel: text("partnerLevel"),
    integrationPartner: text("integrationPartner") === "true",
    strategicPartner: text("strategicPartner") === "true",
    partnerLocationsData: text("partnerLocationsData"),
    regions: list("regions") as Props["regions"],
    locationCountries: list("locationCountries"),
    countries: list("countries"),
  };
};
export const partnerExpertise = (props: Props) => {
  if (props.expertiseBody !== undefined) return props.expertiseBody;
  const escape = (s: string) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const items = [
    ...new Set(
      [...(props.expertiseText || "").split(/\r?\n/), ...(props.expertise || [])]
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  return [
    items.length ? "<ul>" + items.map((s) => "<li>" + escape(s) + "</li>").join("") + "</ul>" : "",
    props.technologyDetails,
  ]
    .filter(Boolean)
    .join("\n");
};
