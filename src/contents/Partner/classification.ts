export const partnerClassifications = [
  "solution_silver",
  "solution_gold",
  "solution_diamond",
  "technology_integration",
  "technology_strategic",
] as const;
export type PartnerClassification = (typeof partnerClassifications)[number];
type Classification = {
  type: "integrator" | "technology";
  level?: "silver" | "gold" | "diamond";
  partnership?: "integration" | "strategic";
};
const classifications: Record<PartnerClassification, Classification> = {
  solution_silver: { type: "integrator", level: "silver" },
  solution_gold: { type: "integrator", level: "gold" },
  solution_diamond: { type: "integrator", level: "diamond" },
  technology_integration: { type: "technology", partnership: "integration" },
  technology_strategic: { type: "technology", partnership: "strategic" },
};
export const classificationOf = (value?: string): Classification | undefined =>
  value && Object.hasOwn(classifications, value)
    ? classifications[value as PartnerClassification]
    : undefined;
