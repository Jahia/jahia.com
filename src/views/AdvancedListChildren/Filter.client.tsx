import { type FormEvent, type ReactNode, useEffect, useRef } from "react";
import { restoreResourceFilters, saveResourceFilters } from "../../components/resourceSession.js";
import { updateCascadingSelects } from "../../components/CascadingSelects.client.jsx";

const selectedFilters = (form: HTMLFormElement) =>
  [...form.querySelectorAll<HTMLSelectElement>("select[data-filter]")]
    .filter((select) => select.value)
    .map((select) => `${select.name}=${select.value}`);

const applyFilters = (form: HTMLFormElement, stateId: string) => {
  const filters = selectedFilters(form);

  for (const child of form.querySelectorAll<HTMLElement>("[data-filter-values]")) {
    const values = new Set((child.dataset.filterValues || "").split("|").filter(Boolean));
    child.toggleAttribute("hidden", !filters.every((filter) => values.has(filter)));
  }

  saveResourceFilters(form, stateId);
};

export default function Filter({ children, stateId }: { children: ReactNode; stateId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    restoreResourceFilters(ref.current, stateId);
    updateCascadingSelects(ref.current);
    applyFilters(ref.current, stateId);
  }, [stateId]);
  return (
    <form
      ref={ref}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(event.currentTarget, stateId);
      }}
      onChange={(event) => {
        updateCascadingSelects(event.currentTarget);
        applyFilters(event.currentTarget, stateId);
      }}
      onReset={(event) => {
        const form = event.currentTarget;
        window.setTimeout(() => {
          updateCascadingSelects(form);
          applyFilters(form, stateId);
        });
      }}
    >
      {children}
    </form>
  );
}
