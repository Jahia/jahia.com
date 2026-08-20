import { type ReactNode, useEffect, useRef, useState } from "react";

interface Props {
  children: ReactNode;
  pageSize: number;
  initialPage: number;
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
  initialPage,
  gridClassName,
  paginationClassName,
  paginationLabel,
  selectLabel,
  previousLabel,
  nextLabel,
}: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [pageCount, setPageCount] = useState(1);
  const [filterVersion, setFilterVersion] = useState(0);

  useEffect(() => {
    const update = () => {
      setPage(1);
      setFilterVersion((version) => version + 1);
    };
    window.addEventListener("blog-filter-change", update);
    return () => window.removeEventListener("blog-filter-change", update);
  }, []);

  useEffect(() => {
    if (!grid.current) return;
    const slots = [...grid.current.querySelectorAll<HTMLElement>("[data-blog-card-slot]")];
    const cards = slots.filter(
      (slot) => slot.dataset.filterMatch !== "false" && slot.querySelector("article"),
    );
    const count = Math.max(1, Math.ceil(cards.length / pageSize));
    const current = Math.min(Math.max(1, page), count);

    slots.forEach((slot) => (slot.hidden = true));
    cards.forEach((slot, index) => {
      slot.hidden = index < (current - 1) * pageSize || index >= current * pageSize;
    });
    // The count depends on Jahia's final rendered DOM; it cannot be known during the initial render.
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setPageCount(count);
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    if (current !== page) setPage(current);

    const url = new URL(window.location.href);
    if (current === 1) url.searchParams.delete("blogPage");
    else url.searchParams.set("blogPage", String(current));
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [filterVersion, page, pageSize]);

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
