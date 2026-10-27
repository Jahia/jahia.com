import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import classes from "./component.module.css";
import listingClasses from "../ContentFolderReference/styles.module.css";
import type { Props } from "./types.js";

const defaultFilters = ["type", "query", "theme", "year", "sort"] as const;
const defaultTypes = ["communique", "presse", "tribune", "recompense", "evenement"];

export default function Filters({
  id,
  children,
  isEditMode,
  pageSize = 6,
  layout = "cards",
  heading,
  hiddenFilters,
  filterTypes,
}: {
  id: string;
  children?: ReactNode;
  isEditMode: boolean;
  pageSize?: number;
  layout?: "cards" | "list" | "coverage";
  heading?: string;
  hiddenFilters?: Props["hiddenFilters"];
  filterTypes?: Props["filterTypes"];
}) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const enabled = (name: (typeof defaultFilters)[number]) => !(hiddenFilters ?? []).includes(name);
  const hasConfiguredFilters = layout !== "coverage" && defaultFilters.some(enabled);
  useEffect(() => {
    if (isEditMode || !root.current) return;
    const element = root.current;
    const form = element.querySelector<HTMLFormElement>("form");
    const grid = element.querySelector<HTMLElement>("[data-press-grid]")!;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-press-card]"));
    const pagination = element.querySelector<HTMLElement>("[data-press-pagination]")!;
    const pageSelect = pagination.querySelector<HTMLSelectElement>("select")!;
    const previous = pagination.querySelector<HTMLButtonElement>("[data-press-previous]")!;
    const next = pagination.querySelector<HTMLButtonElement>("[data-press-next]")!;
    const perPage = Math.min(60, Math.max(1, Math.floor(pageSize) || 6));
    let currentPage = 1;
    const themes = (card: HTMLElement): string[] => {
      try {
        return JSON.parse(card.dataset.themes || "[]");
      } catch {
        return card.dataset.topic ? [card.dataset.topic] : [];
      }
    };
    const field = (name: string): Pick<HTMLInputElement, "value" | "disabled"> =>
      (form?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null) ?? {
        value: name === "sort" ? "recent" : "",
        disabled: true,
      };
    const key = `jahia-press:${location.pathname}:${id}`;
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase();
    for (const name of ["theme", "year"]) {
      if (!form) break;
      const select = field(name) as HTMLSelectElement;
      while (select.options.length > 1) select.remove(1);
      const values = [
        ...new Set(
          cards
            .flatMap((card) => (name === "theme" ? themes(card) : [card.dataset[name] || ""]))
            .filter(Boolean),
        ),
      ].sort();
      if (name === "year") values.reverse();
      values.forEach((value) => select.add(new Option(value, value)));
      if (name === "year") {
        const hidden = values.length <= 1 || (hiddenFilters ?? []).includes(name);
        select.closest("label")!.hidden = hidden;
        select.disabled = hidden;
        if (hidden) select.value = "";
      }
    }
    if (form) {
      const hasVisibleControls = defaultFilters
        .filter((name) => name !== "type")
        .some((name) => !field(name).disabled);
      form.hidden = field("type").disabled && !hasVisibleControls;
      form.querySelector<HTMLElement>("[data-press-controls]")!.hidden = !hasVisibleControls;
    }
    let scroll = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "null") as Record<
        string,
        unknown
      > | null;
      if (saved) {
        for (const name of layout === "coverage"
          ? []
          : ["query", "type", "theme", "year", "sort"]) {
          const control = field(name);
          if (control.disabled) continue;
          if (
            typeof saved[name] === "string" &&
            (!(control instanceof HTMLSelectElement) ||
              Array.from(control.options).some((option) => option.value === saved[name])) &&
            (name !== "type" ||
              ["", ...(filterTypes?.length ? filterTypes : defaultTypes)].includes(
                String(saved[name]),
              ))
          )
            control.value = saved[name];
        }
        scroll = Number(saved.scroll) || 0;
        currentPage = Math.max(1, Math.floor(Number(saved.page)) || 1);
      }
    } catch {
      /* Storage can be disabled by browser preferences. */
    }
    const save = () => {
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            ...Object.fromEntries(form ? new FormData(form) : []),
            page: currentPage,
            scroll: window.scrollY,
          }),
        );
      } catch {
        /* Filtering works without storage. */
      }
    };
    const apply = () => {
      form?.querySelectorAll<HTMLButtonElement>("[data-press-tab]").forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.pressTab === field("type").value),
        );
      });
      const query = normalize(field("query").value);
      const matching = cards
        .sort(
          (a, b) =>
            (Number(b.dataset.timestamp) - Number(a.dataset.timestamp)) *
            (field("sort").value === "recent" ? 1 : -1),
        )
        .filter(
          (card) =>
            !(
              ["type", "year"].some(
                (name) => field(name).value && field(name).value !== card.dataset[name],
              ) ||
              (field("theme").value && !themes(card).includes(field("theme").value)) ||
              !normalize(card.textContent || "").includes(query)
            ),
        );
      const count = matching.length;
      const totalPages = Math.max(1, Math.ceil(count / perPage));
      currentPage = Math.min(currentPage, totalPages);
      cards.forEach((card) => {
        card.hidden = true;
      });
      matching.forEach((card, index) => {
        card.hidden = index < (currentPage - 1) * perPage || index >= currentPage * perPage;
        grid.append(card);
      });
      pageSelect.replaceChildren();
      for (let number = 1; number <= totalPages; number++) {
        pageSelect.add(
          new Option(
            t("pressRoom.pagePosition", { page: number, total: totalPages }),
            String(number),
          ),
        );
      }
      pageSelect.value = String(currentPage);
      previous.disabled = currentPage === 1;
      next.disabled = currentPage === totalPages;
      pagination.hidden = totalPages <= 1;
      element.querySelector<HTMLElement>("[data-press-count]")!.textContent = t(
        "pressRoom.results",
        { count },
      );
      element.querySelector<HTMLElement>("[data-press-empty]")!.hidden = count > 0;
    };
    const change = () => {
      currentPage = 1;
      apply();
      save();
    };
    const submit = (event: Event) => event.preventDefault();
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      field("type").value = "";
      resetTimer = setTimeout(change, 0);
    };
    const pageShow = () => {
      apply();
    };
    const navigate = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target === previous) currentPage--;
      else if (target === next) currentPage++;
      else if (target === pageSelect && event.type === "change")
        currentPage = Number(pageSelect.value);
      else return;
      apply();
      save();
      grid.scrollIntoView({ block: "start" });
      grid
        .querySelector<HTMLElement>(
          "[data-press-card]:not([hidden]) a, [data-press-card]:not([hidden]) h3",
        )
        ?.focus({ preventScroll: true });
    };
    form?.addEventListener("input", change);
    form?.addEventListener("submit", submit);
    form?.addEventListener("reset", reset);
    element.addEventListener("click", save);
    window.addEventListener("pagehide", save);
    window.addEventListener("pageshow", pageShow);
    pagination.addEventListener("click", navigate);
    pageSelect.addEventListener("change", navigate);
    apply();
    if (scroll && !location.hash)
      document.fonts.ready.then(() => requestAnimationFrame(() => window.scrollTo(0, scroll)));
    return () => {
      clearTimeout(resetTimer);
      form?.removeEventListener("input", change);
      form?.removeEventListener("submit", submit);
      form?.removeEventListener("reset", reset);
      element.removeEventListener("click", save);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("pageshow", pageShow);
      pagination.removeEventListener("click", navigate);
      pageSelect.removeEventListener("change", navigate);
    };
  }, [id, isEditMode, pageSize, layout, hiddenFilters, filterTypes, t]);
  return (
    <div ref={root}>
      <div className={classes.listingHeader}>
        {heading && <h2 id={`${id}-news`}>{heading}</h2>}
        {!isEditMode && hasConfiguredFilters && (
          <form className={classes.filters} hidden>
            <input type="hidden" name="type" defaultValue="" disabled={!enabled("type")} />
            <div
              className={classes.filterBar}
              role="group"
              aria-label={t("pressRoom.type")}
              hidden={!enabled("type")}
            >
              {["", ...(filterTypes?.length ? filterTypes : defaultTypes)].map((type) => (
                <button
                  key={type}
                  type="button"
                  data-press-tab={type}
                  aria-pressed={type === ""}
                  onClick={() => {
                    const control =
                      root.current!.querySelector<HTMLInputElement>('input[name="type"]')!;
                    control.value = type;
                    control.dispatchEvent(new Event("input", { bubbles: true }));
                  }}
                >
                  {type ? t(`pressRoom.types.${type}`) : t("pressRoom.all")}
                </button>
              ))}
            </div>
            <div className={classes.controls} data-press-controls="">
              <label htmlFor={`${id}-query`} hidden={!enabled("query")}>
                {t("pressRoom.search")}
                <input id={`${id}-query`} name="query" type="search" disabled={!enabled("query")} />
              </label>
              <label htmlFor={`${id}-theme`} hidden={!enabled("theme")}>
                {t("pressRoom.theme")}
                <select id={`${id}-theme`} name="theme" disabled={!enabled("theme")}>
                  <option value="">{t("pressRoom.allThemes")}</option>
                </select>
              </label>
              <label htmlFor={`${id}-year`} hidden={!enabled("year")}>
                {t("pressRoom.year")}
                <select id={`${id}-year`} name="year" disabled={!enabled("year")}>
                  <option value="">{t("pressRoom.allYears")}</option>
                </select>
              </label>
              <label htmlFor={`${id}-sort`} hidden={!enabled("sort")}>
                {t("pressRoom.sort")}
                <select id={`${id}-sort`} name="sort" disabled={!enabled("sort")}>
                  <option value="recent">{t("pressRoom.recent")}</option>
                  <option value="oldest">{t("pressRoom.oldest")}</option>
                </select>
              </label>
              <button
                className={classes.reset}
                type="reset"
                hidden={defaultFilters.every((name) => (hiddenFilters ?? []).includes(name))}
              >
                {t("pressRoom.reset")}
              </button>
            </div>
          </form>
        )}
      </div>
      {!isEditMode && (
        <>
          <p data-press-count="" role="status" aria-live="polite" />
          <p data-press-empty="" hidden>
            {t("pressRoom.empty")}
          </p>
        </>
      )}
      <div className={classes.grid} data-press-grid="" data-layout={layout}>
        {children}
      </div>
      {!isEditMode && (
        <nav
          data-press-pagination=""
          className={listingClasses.pagination}
          aria-label={t("pressRoom.pagination")}
          hidden
        >
          <button type="button" data-press-previous="">
            {t("pressRoom.previous")}
          </button>
          <select aria-label={t("pressRoom.choosePage")} />
          <button type="button" data-press-next="">
            {t("pressRoom.next")}
          </button>
        </nav>
      )}
    </div>
  );
}
