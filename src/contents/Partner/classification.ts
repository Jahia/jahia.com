export const partnerClassifications = [
  "solution_silver",
  "solution_gold",
  "solution_diamond",
  "technology_integration",
  "technology_strategic",
] as const;
export type PartnerClassification = (typeof partnerClassifications)[number];
export interface LegacyPartnerIdentity {
  partnerClassification?: string;
  partnerType?: "integrator" | "technology";
  certification?: "silver" | "gold" | "diamond";
  partnerLevel?: string;
  integrationPartner?: boolean;
  strategicPartner?: boolean;
}

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
export const classificationOf = (
  input?: string | LegacyPartnerIdentity,
): Classification | undefined => {
  const value = typeof input === "string" ? input : input?.partnerClassification;
  if (value !== undefined)
    return Object.hasOwn(classifications, value)
      ? classifications[value as PartnerClassification]
      : undefined;
  if (!input || typeof input === "string") return undefined;
  if (input.partnerType === "technology" || input.integrationPartner || input.strategicPartner)
    return {
      type: "technology",
      partnership: input.strategicPartner ? "strategic" : "integration",
    };
  return { type: "integrator", level: input.certification };
};
