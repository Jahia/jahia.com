import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  readResourceState,
  restoreResourceFilters,
  saveResourceState,
  cleanResourceUrl,
} from "../../components/resourceSession.js";
import { updateCascadingSelects } from "../../components/CascadingSelects.client.jsx";

interface Props {
  children: ReactNode;
  pageSize: number;
  stateId: string;
  gridClassName: string;
  paginationClassName: string;
  paginationLabel: string;
  selectLabel: string;
  previousLabel: string;
  nextLabel: string;
}

export default function BlogGrid({
  children,
  pageSize,
  stateId,
  gridClassName,
  paginationClassName,
  paginationLabel,
  selectLabel,
  previousLabel,
  nextLabel,
}: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [filterVersion, setFilterVersion] = useState(0);

  const initialized = useRef(false);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ stateId: string; resetPage: boolean }>).detail;
      if (detail?.stateId !== stateId) return;
      if (detail.resetPage) setPage(1);
      setFilterVersion((version) => version + 1);
    };
    window.addEventListener("blog-filter-change", update);
    return () => window.removeEventListener("blog-filter-change", update);
  }, [stateId]);

  useEffect(() => {
    if (!grid.current) return;
    let requestedPage = page;
    const section = grid.current.closest("section");
    if (!initialized.current) {
      requestedPage = readResourceState(stateId).page;
      if (section) {
        restoreResourceFilters(section, stateId);
        updateCascadingSelects(section);
      }
      initialized.current = true;
    }
    const filters = [
      ...(section?.querySelectorAll<HTMLSelectElement>("select[name^=filter]") || []),
    ]
      .filter((select) => select.value)
      .map((select) => `${select.name}=${select.value}`);
    const slots = [...grid.current.querySelectorAll<HTMLElement>("[data-blog-card-slot]")];
    for (const slot of slots) {
      const values = new Set((slot.dataset.filterValues || "").split("|"));
      slot.dataset.filterMatch = String(filters.every((filter) => values.has(filter)));
    }
    const cards = slots.filter(
      (slot) => slot.dataset.filterMatch !== "false" && slot.querySelector("article"),
    );
    const count = Math.max(1, Math.ceil(cards.length / pageSize));
    const current = Math.min(Math.max(1, requestedPage), count);

    slots.forEach((slot) => (slot.hidden = true));
    cards.forEach((slot, index) => {
      slot.hidden = index < (current - 1) * pageSize || index >= current * pageSize;
    });
    // The count depends on Jahia's final rendered DOM; it cannot be known during the initial render.
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setPageCount(count);
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    if (current !== page) setPage(current);

    saveResourceState(stateId, { page: current });
    cleanResourceUrl();
  }, [filterVersion, page, pageSize, stateId]);

  return (
    <>
      <div ref={grid} className={gridClassName}>
        {children}
      </div>
      {pageCount > 1 && (
        <nav className={paginationClassName} aria-label={paginationLabel}>
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
            {previousLabel}
          </button>
          <select
            aria-label={selectLabel}
            value={page}
            onChange={(event) => setPage(+event.target.value)}
          >
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <option key={number} value={number}>
                {number}/{pageCount}
              </option>
            ))}
          </select>
          <button type="button" disabled={page === pageCount} onClick={() => setPage(page + 1)}>
            {nextLabel}
          </button>
        </nav>
      )}
    </>
  );
}
