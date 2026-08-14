import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import classes from "./component.module.css";

type PartnerType = "all" | "integrator" | "technology";
type Region = "all" | "europe" | "americas" | "apac";

const typeParameter = "partnerType";
const regionParameter = "partnerRegion";

const isPartnerType = (value: string | null): value is PartnerType =>
  value === "all" || value === "integrator" || value === "technology";

const isRegion = (value: string | null): value is Region =>
  value === "all" || value === "europe" || value === "americas" || value === "apac";

const filtersFromUrl = (): { type: PartnerType; region: Region } => {
  if (typeof window === "undefined") return { type: "all", region: "all" };

  const parameters = new URLSearchParams(window.location.search);
  const type = parameters.get(typeParameter);
  const region = parameters.get(regionParameter);
  return {
    type: isPartnerType(type) ? type : "all",
    region: isRegion(region) ? region : "all",
  };
};

const replaceFiltersInUrl = (type: PartnerType, region: Region) => {
  const url = new URL(window.location.href);

  if (type === "all") url.searchParams.delete(typeParameter);
  else url.searchParams.set(typeParameter, type);

  if (region === "all") url.searchParams.delete(regionParameter);
  else url.searchParams.set(regionParameter, region);

  window.history.replaceState(window.history.state, "", url);
};

export default function Directory({
  children,
  total,
  integratorCount,
  technologyCount,
  regionCounts,
}: {
  children?: ReactNode;
  total: number;
  integratorCount: number;
  technologyCount: number;
  regionCounts: Record<Exclude<Region, "all">, number>;
}) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<PartnerType>(() => filtersFromUrl().type);
  const [region, setRegion] = useState<Region>(() => filtersFromUrl().region);
  const [visible, setVisible] = useState(total);
  const availableTypes = (["all", "integrator", "technology"] as const).filter(
    (value) =>
      value === "all" || (value === "integrator" ? integratorCount > 0 : technologyCount > 0),
  );
  const activeType = availableTypes.includes(type) ? type : "all";

  useEffect(() => {
    replaceFiltersInUrl(activeType, region);
  }, [activeType, region]);

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    let count = 0;

    for (const card of container.querySelectorAll<HTMLElement>("[data-partner-card]")) {
      const regions = (card.dataset.partnerRegions || "").split(",");
      const matches =
        (activeType === "all" || card.dataset.partnerType === activeType) &&
        (region === "all" || regions.includes(region));
      card.hidden = !matches;
      if (matches) count += 1;

      for (const link of card.querySelectorAll<HTMLAnchorElement>("[data-region-links]")) {
        const regionLinks = JSON.parse(link.dataset.regionLinks || "{}") as Partial<
          Record<Exclude<Region, "all">, string>
        >;
        const targetUrl =
          (region !== "all" ? regionLinks[region] : undefined) ||
          link.dataset.defaultRegionLink ||
          link.href;
        link.href = targetUrl;
        link.dataset.elementUrl = targetUrl;
      }
    }
    const updateCount = requestAnimationFrame(() => setVisible(count));
    return () => cancelAnimationFrame(updateCount);
  }, [activeType, region]);

  useEffect(() => {
    const navigateToDirectory = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-partner-type-target], [data-partner-region-target]",
      );
      if (!target) return;
      const nextType = target.dataset.partnerTypeTarget as PartnerType | undefined;
      const nextRegion = target.dataset.partnerRegionTarget as Region | undefined;
      if (
        nextType &&
        ((nextType === "integrator" && integratorCount === 0) ||
          (nextType === "technology" && technologyCount === 0))
      ) {
        return;
      }
      event.preventDefault();
      if (nextType) setType(nextType);
      if (nextRegion) {
        setType("all");
        setRegion(nextRegion);
      }
      document.getElementById("partner-directory")?.scrollIntoView({ behavior: "smooth" });
    };
    document.addEventListener("click", navigateToDirectory);
    return () => document.removeEventListener("click", navigateToDirectory);
  }, [integratorCount, technologyCount]);

  useEffect(() => {
    for (const value of ["europe", "americas", "apac"] as const) {
      for (const count of document.querySelectorAll<HTMLElement>(
        `[data-partner-region-count="${value}"]`,
      )) {
        count.textContent = String(regionCounts[value]);
      }
    }
  }, [regionCounts.apac, regionCounts.americas, regionCounts.europe]);

  const reset = () => {
    setType("all");
    setRegion("all");
  };

  return (
    <div ref={root} id="partner-directory-results">
      <div className={classes.filters}>
        <div className={classes.typeFilters} aria-label={t("partner.allTypes")}>
          {availableTypes.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={activeType === value}
              onClick={() => setType(value)}
            >
              {t(
                value === "all"
                  ? "partner.allTypes"
                  : value === "integrator"
                    ? "partner.integrators"
                    : "partner.technology",
              )}{" "}
              <span>
                (
                {value === "all"
                  ? total
                  : value === "integrator"
                    ? integratorCount
                    : technologyCount}
                )
              </span>
            </button>
          ))}
        </div>
        <label>
          <span>{t("partner.region")}</span>
          <select value={region} onChange={(event) => setRegion(event.target.value as Region)}>
            <option value="all">{t("partner.allRegions")}</option>
            <option value="europe">
              {t("partner.regions.europe")}
              {` (${regionCounts.europe})`}
            </option>
            <option value="americas">
              {t("partner.regions.americas")}
              {` (${regionCounts.americas})`}
            </option>
            <option value="apac">
              {t("partner.regions.apac")}
              {` (${regionCounts.apac})`}
            </option>
          </select>
        </label>
        <strong className={classes.count}>{t("partner.count", { count: visible })}</strong>
      </div>
      <div className={classes.grid}>{children}</div>
      {visible === 0 && (
        <div className={classes.emptyState}>
          <p>{t("partner.empty")}</p>
          <button type="button" onClick={reset}>
            {t("partner.clear")}
          </button>
        </div>
      )}
    </div>
  );
}
