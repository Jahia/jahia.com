import {
  classificationOf,
  type LegacyPartnerIdentity,
} from "../../contents/Partner/classification.js";
import type { Region } from "../../contents/Partner/types.js";

export type PartnerSort = "levelAlphabetical" | "regionAlphabetical" | "partnershipAlphabetical";

export const defaultPartnerSort = (mode: string): PartnerSort =>
  mode === "technology" ? "partnershipAlphabetical" : "regionAlphabetical";

type Partner = LegacyPartnerIdentity & {
  "jcr:title": string;
  "regions"?: Region[];
};

export const regionPriority: Record<Region, number> = {
  europe: 0,
  americas: 1,
  apac: 2,
};

const levelPriority = { diamond: 0, gold: 1, silver: 2 };
const normalizedTitle = (title: string) =>
  title
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

export const comparePartners = (left: Partner, right: Partner, sort: PartnerSort) => {
  const priority = (partner: Partner) => {
    if (sort === "partnershipAlphabetical") {
      const partnership = classificationOf(partner)?.partnership;
      return partnership === "strategic" ? 0 : partnership === "integration" ? 1 : 2;
    }
    if (sort === "levelAlphabetical") {
      const level = classificationOf(partner)?.level;
      // Technology partners and unspecified levels follow the three certified levels.
      return level ? levelPriority[level] : 3;
    }
    const region = partner.regions?.[0];
    return region ? regionPriority[region] : 3;
  };
  const difference = priority(left) - priority(right);
  if (difference) return difference;
  const leftTitle = normalizedTitle(left["jcr:title"]);
  const rightTitle = normalizedTitle(right["jcr:title"]);
  return leftTitle < rightTitle ? -1 : leftTitle > rightTitle ? 1 : 0;
};
