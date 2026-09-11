import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import classes from "./component.module.css";

type DirectoryMode = "all" | "solution" | "technology";
type PartnerType = "all" | "integrator" | "technology";
type PartnerLevel = "all" | "diamond" | "gold" | "silver";
type Region = "all" | "europe" | "americas" | "apac";
type Partnership = "all" | "strategic" | "integration";

interface TechnologyOption {
  value: string;
  label: string;
  partnerships: Array<Exclude<Partnership, "all">>;
}

const typeParameter = "partnerType";
const levelParameter = "partnerLevel";
const regionParameter = "partnerRegion";
const technologyParameter = "technology";
const partnershipParameter = "partnership";
const levels = ["diamond", "gold", "silver"] as const;

const valueFromUrl = <Value extends string>(
  name: string,
  allowed: readonly Value[],
  fallback: Value,
): Value => {
  if (typeof window === "undefined") return fallback;
  const value = new URLSearchParams(window.location.search).get(name) as Value | null;
  return value && allowed.includes(value) ? value : fallback;
};

const replaceFiltersInUrl = (values: Record<string, string>) => {
  const url = new URL(window.location.href);
  for (const [name, value] of Object.entries(values)) {
    if (value === "all") url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }
  window.history.replaceState(window.history.state, "", url);
};

export default function Directory({
  children,
  mode,
  total,
  integratorCount,
  technologyCount,
  regionCounts,
  technologies,
  levelCounts,
  filterItems,
}: {
  children?: ReactNode;
  mode: DirectoryMode;
  total: number;
  integratorCount: number;
  technologyCount: number;
  regionCounts: Record<Exclude<Region, "all">, number>;
  technologies: TechnologyOption[];
  levelCounts: Record<Exclude<PartnerLevel, "all">, number>;
  filterItems: Array<{ level: Exclude<PartnerLevel, "all">; regions: Region[] }>;
}) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<PartnerType>(() =>
    valueFromUrl(typeParameter, ["all", "integrator", "technology"], "all"),
  );
  const [region, setRegion] = useState<Region>(() =>
    valueFromUrl(regionParameter, ["all", "europe", "americas", "apac"], "all"),
  );
  const [level, setLevel] = useState<PartnerLevel>(() =>
    valueFromUrl(levelParameter, ["all", "diamond", "gold", "silver"], "all"),
  );
  const [technology, setTechnology] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get(technologyParameter) || "all";
  });
  const [partnership, setPartnership] = useState<Partnership>(() =>
    valueFromUrl(partnershipParameter, ["all", "strategic", "integration"], "all"),
  );
  const [visible, setVisible] = useState(total);

  const availableTypes = (["all", "integrator", "technology"] as const).filter(
    (value) =>
      value === "all" || (value === "integrator" ? integratorCount > 0 : technologyCount > 0),
  );
  const activeType = availableTypes.includes(type) ? type : "all";
  const availableRegions = (["europe", "americas", "apac"] as const).filter(
    (value) => regionCounts[value] > 0,
  );
  const activeRegion = availableRegions.includes(region as Exclude<Region, "all">) ? region : "all";
  const availableLevels = useMemo<PartnerLevel[]>(
    () => [
      "all",
      ...levels.filter((value) =>
        filterItems.some(
          (item) =>
            item.level === value && (activeRegion === "all" || item.regions.includes(activeRegion)),
        ),
      ),
    ],
    [activeRegion, filterItems],
  );
  const activeLevel = availableLevels.includes(level) ? level : "all";
  const availableTechnologies = technologies.filter(
    (option) => partnership === "all" || option.partnerships.includes(partnership),
  );
  const activeTechnology = availableTechnologies.some((option) => option.value === technology)
    ? technology
    : "all";
  const availablePartnerships = (["strategic", "integration"] as const).filter(
    (value) =>
      activeTechnology === "all" ||
      technologies.some(
        (option) => option.value === activeTechnology && option.partnerships.includes(value),
      ),
  );
  const activePartnership = availablePartnerships.includes(
    partnership as Exclude<Partnership, "all">,
  )
    ? partnership
    : "all";

  useEffect(() => {
    if (mode === "solution") {
      replaceFiltersInUrl({
        [levelParameter]: activeLevel,
        [regionParameter]: activeRegion,
      });
    } else if (mode === "technology") {
      replaceFiltersInUrl({
        [technologyParameter]: activeTechnology,
        [partnershipParameter]: activePartnership,
      });
    } else {
      replaceFiltersInUrl({ [typeParameter]: activeType, [regionParameter]: activeRegion });
    }
  }, [activeLevel, activePartnership, activeRegion, activeTechnology, activeType, mode]);

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    let count = 0;

    for (const card of container.querySelectorAll<HTMLElement>("[data-partner-card]")) {
      const regions = (card.dataset.partnerRegions || "").split(",");
      const cardTechnologies = (card.dataset.partnerTechnologies || "").split(",");
      const matches =
        mode === "solution"
          ? (activeRegion === "all" || regions.includes(activeRegion)) &&
            (activeLevel === "all" || card.dataset.partnerLevel === activeLevel)
          : mode === "technology"
            ? (activeTechnology === "all" || cardTechnologies.includes(activeTechnology)) &&
              (activePartnership === "all" || card.dataset.partnerPartnership === activePartnership)
            : (activeType === "all" || card.dataset.partnerType === activeType) &&
              (activeRegion === "all" || regions.includes(activeRegion));
      card.hidden = !matches;
      if (matches) count += 1;

      if (mode !== "technology") {
        for (const link of card.querySelectorAll<HTMLAnchorElement>("[data-region-links]")) {
          const regionLinks = JSON.parse(link.dataset.regionLinks || "{}") as Partial<
            Record<Exclude<Region, "all">, string>
          >;
          const targetUrl =
            (activeRegion !== "all" ? regionLinks[activeRegion] : undefined) ||
            link.dataset.defaultRegionLink ||
            link.href;
          link.href = targetUrl;
          link.dataset.elementUrl = targetUrl;
        }
      }
    }
    const updateCount = requestAnimationFrame(() => setVisible(count));
    return () => cancelAnimationFrame(updateCount);
  }, [activeLevel, activePartnership, activeRegion, activeTechnology, activeType, mode]);

  useEffect(() => {
    for (const value of ["europe", "americas", "apac"] as const) {
      for (const count of document.querySelectorAll<HTMLElement>(
        `[data-partner-region-count="${value}"]`,
      )) {
        count.textContent = t("partner.regionCount", { count: regionCounts[value] });
      }
      for (const target of document.querySelectorAll<HTMLElement>(
        `[data-partner-region-target="${value}"]`,
      )) {
        target
          .closest<HTMLElement>("article")
          ?.toggleAttribute("hidden", regionCounts[value] === 0);
      }
    }
  }, [regionCounts.apac, regionCounts.americas, regionCounts.europe, t]);

  useEffect(() => {
    if (mode !== "solution") return;

    const navigateToRegion = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-partner-region-target]",
      );
      const nextRegion = target?.dataset.partnerRegionTarget as Region | undefined;
      if (!nextRegion || nextRegion === "all" || regionCounts[nextRegion] === 0) return;

      event.preventDefault();
      if (
        level !== "all" &&
        !filterItems.some((item) => item.level === level && item.regions.includes(nextRegion))
      ) {
        setLevel("all");
      }
      setRegion(nextRegion);
      document.getElementById("partner-directory")?.scrollIntoView({ behavior: "smooth" });
    };

    document.addEventListener("click", navigateToRegion);
    return () => document.removeEventListener("click", navigateToRegion);
  }, [filterItems, level, mode, regionCounts]);

  const reset = () => {
    setType("all");
    setRegion("all");
    setLevel("all");
    setTechnology("all");
    setPartnership("all");
  };

  const selectTechnology = (value: string) => {
    setTechnology(value);
    if (
      value !== "all" &&
      partnership !== "all" &&
      !technologies.some(
        (option) => option.value === value && option.partnerships.includes(partnership),
      )
    ) {
      setPartnership("all");
    }
  };

  const selectPartnership = (value: Partnership) => {
    setPartnership(value);
    if (
      value !== "all" &&
      technology !== "all" &&
      !technologies.some(
        (option) => option.value === technology && option.partnerships.includes(value),
      )
    ) {
      setTechnology("all");
    }
  };

  return (
    <div ref={root} id="partner-directory-results">
      <div className={classes.filters} data-mode={mode} data-partner-filter-bar="">
        {mode === "solution" && (
          <fieldset className={classes.levelFilter}>
            <legend>{t("partner.level")}</legend>
            <div className={classes.levelButtons}>
              {availableLevels.map((value) => (
                <button
                  key={value}
                  type="button"
                  name={levelParameter}
                  value={value}
                  aria-pressed={activeLevel === value}
                  onClick={() => setLevel(value)}
                >
                  {value === "all"
                    ? t("partner.allLevels")
                    : `${t(`partner.levels.${value}`)} (${levelCounts[value]})`}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {mode === "all" && (
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
                )}
              </button>
            ))}
          </div>
        )}

        {mode === "all" && (
          <label>
            <span>{t("partner.region")}</span>
            <select
              value={activeRegion}
              onChange={(event) => setRegion(event.target.value as Region)}
            >
              <option value="all">{t("partner.allRegions")}</option>
              {availableRegions.map((value) => (
                <option key={value} value={value}>
                  {t(`partner.regions.${value}`)} ({regionCounts[value]})
                </option>
              ))}
            </select>
          </label>
        )}

        {mode === "solution" && activeRegion !== "all" && (
          <button
            className={classes.regionChip}
            type="button"
            onClick={() => setRegion("all")}
            aria-label={t("partner.clearRegion", {
              region: t(`partner.regions.${activeRegion}`),
            })}
          >
            <span className="i-ri:map-pin-2-line" aria-hidden="true" />
            {t(`partner.regions.${activeRegion}`)}
            <span className="i-ri:close-line" aria-hidden="true" />
          </button>
        )}

        {mode === "technology" && (
          <>
            <label>
              <span>{t("partner.technologyFilter")}</span>
              <select
                value={activeTechnology}
                onChange={(event) => selectTechnology(event.target.value)}
              >
                <option value="all">{t("partner.allTechnologies")}</option>
                {availableTechnologies.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("partner.partnershipType")}</span>
              <select
                value={activePartnership}
                onChange={(event) => selectPartnership(event.target.value as Partnership)}
              >
                <option value="all">{t("partner.allPartnershipTypes")}</option>
                {availablePartnerships.map((value) => (
                  <option key={value} value={value}>
                    {t(`partner.partnershipTypes.${value}`)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {(mode !== "solution" || activeLevel !== "all" || activeRegion !== "all") && (
          <button className={classes.clear} type="button" onClick={reset}>
            {t("partner.clear")}
            <span className="i-ri:close-line" aria-hidden="true" />
          </button>
        )}
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
