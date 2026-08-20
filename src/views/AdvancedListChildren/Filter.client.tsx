import { type FormEvent, type ReactNode, useEffect, useRef } from "react";
import { updateCascadingSelects } from "../../components/CascadingSelects.client.jsx";

const selectedFilters = (form: HTMLFormElement) =>
  [...form.querySelectorAll<HTMLSelectElement>("select[data-filter]")]
    .filter((select) => select.value)
    .map((select) => `${select.name}=${select.value}`);

const applyFilters = (form: HTMLFormElement) => {
  const filters = selectedFilters(form);

  for (const child of form.querySelectorAll<HTMLElement>("[data-filter-values]")) {
    const values = new Set((child.dataset.filterValues || "").split("|").filter(Boolean));
    child.toggleAttribute("hidden", !filters.every((filter) => values.has(filter)));
  }

  const url = new URL(window.location.href);
  for (const select of form.querySelectorAll<HTMLSelectElement>("select[data-filter]")) {
    if (select.value) url.searchParams.set(select.name, select.value);
    else url.searchParams.delete(select.name);
  }
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
};

export default function Filter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ref.current) updateCascadingSelects(ref.current);
  }, []);
  return (
    <form
      ref={ref}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(event.currentTarget);
      }}
      onChange={(event) => {
        updateCascadingSelects(event.currentTarget);
        applyFilters(event.currentTarget);
      }}
      onReset={(event) => {
        const form = event.currentTarget;
        window.setTimeout(() => {
          updateCascadingSelects(form);
          applyFilters(form);
        });
      }}
    >
      {children}
    </form>
  );
}
