import type { ContainerProps } from "../../theme/index.jsx";

export type Props = ContainerProps & {
  "jcr:title"?: string;
  "subtitle"?: string;
  "pageSize"?: number;
  "layout"?: "cards" | "list" | "coverage";
  "hiddenFilters"?: Array<"type" | "query" | "theme" | "year" | "sort">;
  "filterTypes"?: Array<"communique" | "presse" | "tribune" | "recompense" | "evenement">;
};
