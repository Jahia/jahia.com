import { type FormEvent, type ReactNode, useEffect, useRef } from "react";
import { restoreResourceFilters, saveResourceFilters } from "../../components/resourceSession.js";
import { updateCascadingSelects } from "../../components/CascadingSelects.client.jsx";

const applyFilters = (form: HTMLFormElement, stateId: string) => {
  const filters = [...form.querySelectorAll<HTMLSelectElement>("select")]
    .filter((select) => select.value)
    .map((select) => `${select.name}=${select.value}`);
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
      className="_stack-8"
      onSubmit={(event) => {
        event.preventDefault();
      }}
      onChange={(event: FormEvent<HTMLFormElement>) => {
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
