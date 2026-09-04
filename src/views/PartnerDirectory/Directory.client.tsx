import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import classes from "./component.module.css";

type DirectoryMode = "all" | "solution" | "technology";
type PartnerType = "all" | "integrator" | "technology";
type Region = "all" | "europe" | "americas" | "apac";
type Partnership = "all" | "strategic" | "integration";

interface TechnologyOption {
  value: string;
  label: string;
  partnerships: Array<Exclude<Partnership, "all">>;
}

const typeParameter = "partnerType";
const regionParameter = "partnerRegion";
const technologyParameter = "technology";
const partnershipParameter = "partnership";

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
}: {
  children?: ReactNode;
  mode: DirectoryMode;
  total: number;
  integratorCount: number;
  technologyCount: number;
  regionCounts: Record<Exclude<Region, "all">, number>;
  technologies: TechnologyOption[];
}) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<PartnerType>(() =>
    valueFromUrl(typeParameter, ["all", "integrator", "technology"], "all"),
  );
  const [region, setRegion] = useState<Region>(() =>
    valueFromUrl(regionParameter, ["all", "europe", "americas", "apac"], "all"),
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
      replaceFiltersInUrl({ [regionParameter]: activeRegion });
    } else if (mode === "technology") {
      replaceFiltersInUrl({
        [technologyParameter]: activeTechnology,
        [partnershipParameter]: activePartnership,
      });
    } else {
      replaceFiltersInUrl({ [typeParameter]: activeType, [regionParameter]: activeRegion });
    }
  }, [activePartnership, activeRegion, activeTechnology, activeType, mode]);

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    let count = 0;

    for (const card of container.querySelectorAll<HTMLElement>("[data-partner-card]")) {
      const regions = (card.dataset.partnerRegions || "").split(",");
      const cardTechnologies = (card.dataset.partnerTechnologies || "").split(",");
      const matches =
        mode === "solution"
          ? activeRegion === "all" || regions.includes(activeRegion)
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
  }, [activePartnership, activeRegion, activeTechnology, activeType, mode]);

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

  const selectRegionShortcut = (value: Exclude<Region, "all">) => {
    setRegion(value);
    requestAnimationFrame(() => {
      root.current
        ?.querySelector<HTMLElement>("[data-partner-filter-bar]")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div ref={root} id="partner-directory-results">
      {mode === "solution" && (
        <>
          <section className={classes.solutionIntroduction}>
            <p dangerouslySetInnerHTML={{ __html: t("partner.solutionIntroduction") }} />
          </section>

          <section className={classes.regionShortcuts} id="partner-nearby">
            <header className={classes.regionHeader}>
              <span className={classes.eyebrow}>{t("partner.regionEyebrow")}</span>
              <h2 className={classes.sectionTitle}>{t("partner.regionTitle")}</h2>
              <p className={classes.sectionLead}>{t("partner.regionIntroduction")}</p>
            </header>
            <div className={classes.regionGrid}>
              {availableRegions.map((value) => (
                <button
                  key={value}
                  className={classes.regionButton}
                  type="button"
                  aria-pressed={activeRegion === value}
                  onClick={() => selectRegionShortcut(value)}
                >
                  <strong className={classes.regionName}>{t(`partner.regions.${value}`)}</strong>
                  <span>{t("partner.regionCount", { count: regionCounts[value] })}</span>
                  <span className={classes.regionAction}>
                    {t("partner.showRegion")}
                    <span className="i-ri:arrow-down-s-line" aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <header className={classes.catalogHeader}>
            <span className={classes.eyebrow}>{t("partner.catalogEyebrow")}</span>
            <h2 className={classes.sectionTitle}>{t("partner.catalogTitle")}</h2>
            <p className={classes.sectionLead}>{t("partner.catalogIntroduction")}</p>
          </header>
        </>
      )}

      <div className={classes.filters} data-mode={mode} data-partner-filter-bar="">
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

        {(mode === "solution" || mode === "all") && (
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

        <button className={classes.clear} type="button" onClick={reset}>
          {t("partner.clear")}
          <span className="i-ri:close-line" aria-hidden="true" />
        </button>
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
