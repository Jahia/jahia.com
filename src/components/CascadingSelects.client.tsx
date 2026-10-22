import { type FormEvent, type ReactNode, useEffect, useRef } from "react";
import { restoreResourceFilters, saveResourceFilters } from "./resourceSession.js";

export const updateCascadingSelects = (container: ParentNode) => {
  const levels = [...container.querySelectorAll<HTMLElement>("[data-hierarchy-level]")];
  levels.forEach((level, index) => {
    const select = level.querySelector("select");
    if (!select) return;
    if (index === 0) {
      level.hidden = false;
      return;
    }

    const parentSelect = levels[index - 1]?.querySelector("select");
    const parent = parentSelect?.value || "";
    const parentTitle = parentSelect?.selectedOptions[0]?.textContent?.trim() || "";
    const title = level.querySelector<HTMLElement>("[data-category-title]");
    const placeholder = select.options[0];
    if (title) title.textContent = parentTitle;
    if (placeholder) placeholder.textContent = parentTitle;
    let available = 0;
    for (const option of [...select.options]) {
      if (!option.value) continue;
      const visible = Boolean(parent) && option.dataset.parentId === parent;
      option.hidden = !visible;
      option.disabled = !visible;
      if (visible) available++;
    }
    if (!parent || available === 0) select.value = "";
    else if (select.selectedOptions[0]?.disabled) select.value = "";
    level.hidden = available === 0;
  });

  const form = container instanceof HTMLFormElement ? container : container.querySelector("form");
  if (!form) return;
  const localItems = [...container.querySelectorAll<HTMLElement>("[data-filter-values]")];
  const items =
    localItems.length > 0
      ? localItems
      : [
          ...(form.closest("section") || document).querySelectorAll<HTMLElement>(
            "[data-filter-values]",
          ),
        ];
  if (items.length === 0) return;

  const selects = [...form.querySelectorAll<HTMLSelectElement>("select")];
  const hierarchyLevel = (select: HTMLSelectElement) => {
    const value = select.closest<HTMLElement>("[data-hierarchy-level]")?.dataset.hierarchyLevel;
    return value === undefined ? undefined : Number(value);
  };

  for (const select of selects) {
    const currentLevel = hierarchyLevel(select);
    for (const option of [...select.options]) {
      if (!option.value) continue;
      const structurallyAvailable =
        currentLevel === undefined ||
        currentLevel === 0 ||
        (Boolean(selects[currentLevel - 1]?.value) &&
          option.dataset.parentId === selects[currentLevel - 1]?.value);
      const filters = selects
        .filter((other) => {
          if (other === select || !other.value) return false;
          const otherLevel = hierarchyLevel(other);
          return !(
            currentLevel !== undefined &&
            otherLevel !== undefined &&
            otherLevel > currentLevel
          );
        })
        .map((other) => `${other.name}=${other.value}`);
      filters.push(`${select.name}=${option.value}`);
      const hasResults =
        structurallyAvailable &&
        items.some((item) => {
          const values = new Set((item.dataset.filterValues || "").split("|").filter(Boolean));
          return filters.every((filter) => values.has(filter));
        });
      option.hidden = !hasResults;
      option.disabled = !hasResults;
    }
    if (select.value && select.selectedOptions[0]?.disabled) select.value = "";
  }

  for (const level of levels) {
    const select = level.querySelector("select");
    if (!select) continue;
    const index = Number(level.dataset.hierarchyLevel || 0);
    if (index === 0) level.hidden = false;
    else level.hidden = ![...select.options].some((option) => option.value && !option.disabled);
  }
};

export const applyClientFilters = (container: HTMLElement, stateId: string, resetPage = true) => {
  const form = container.querySelector("form");
  if (!form) return;
  const filters = [...form.querySelectorAll<HTMLSelectElement>("select")]
    .filter((select) => select.value)
    .map((select) => `${select.name}=${select.value}`);
  const scope = container.closest("section") || document;
  for (const child of scope.querySelectorAll<HTMLElement>("[data-filter-values]")) {
    const values = new Set((child.dataset.filterValues || "").split("|").filter(Boolean));
    child.dataset.filterMatch = String(filters.every((filter) => values.has(filter)));
  }
  saveResourceFilters(form, stateId, resetPage);
  window.dispatchEvent(new CustomEvent("blog-filter-change", { detail: { stateId, resetPage } }));
};

export default function CascadingSelects({
  children,
  applyFiltersOnChange = false,
  stateId = "",
  navigateOnChange = false,
}: {
  children: ReactNode;
  applyFiltersOnChange?: boolean;
  stateId?: string;
  navigateOnChange?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (applyFiltersOnChange) restoreResourceFilters(ref.current, stateId);
    updateCascadingSelects(ref.current);
    if (applyFiltersOnChange) applyClientFilters(ref.current, stateId, false);
  }, [applyFiltersOnChange, stateId]);

  return (
    <div
      ref={ref}
      onSubmit={(event) => {
        if (!applyFiltersOnChange) return;
        event.preventDefault();
        applyClientFilters(event.currentTarget, stateId);
      }}
      onChange={(event: FormEvent<HTMLDivElement>) => {
        updateCascadingSelects(event.currentTarget);
        if (navigateOnChange) event.currentTarget.querySelector("form")?.requestSubmit();
        if (applyFiltersOnChange) applyClientFilters(event.currentTarget, stateId);
      }}
      onReset={(event) => {
        if (!applyFiltersOnChange) return;
        const container = event.currentTarget;
        window.setTimeout(() => {
          updateCascadingSelects(container);
          applyClientFilters(container, stateId);
        });
      }}
    >
      {children}
    </div>
  );
}
