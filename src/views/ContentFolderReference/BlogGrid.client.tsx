import type { ReactNode } from "react";
interface Props {
  children: ReactNode;
  page: number;
  pageUrls: string[];
  gridClassName: string;
  paginationClassName: string;
  paginationLabel: string;
  selectLabel: string;
  previousLabel: string;
  nextLabel: string;
}
export default function BlogGrid({
  children,
  page,
  pageUrls,
  gridClassName,
  paginationClassName,
  paginationLabel,
  selectLabel,
  previousLabel,
  nextLabel,
}: Props) {
  return (
    <>
      <div className={gridClassName}>{children}</div>
      {pageUrls.length > 1 && (
        <nav className={paginationClassName} aria-label={paginationLabel}>
          {page > 1 ? (
            <a href={pageUrls[page - 2]} rel="prev">
              {previousLabel}
            </a>
          ) : (
            <button type="button" disabled>
              {previousLabel}
            </button>
          )}
          <select
            aria-label={selectLabel}
            value={page}
            onChange={(event) => window.location.assign(pageUrls[Number(event.target.value) - 1])}
          >
            {pageUrls.map((url, index) => (
              <option key={url} value={index + 1}>
                {index + 1}/{pageUrls.length}
              </option>
            ))}
          </select>
          {page < pageUrls.length ? (
            <a href={pageUrls[page]} rel="next">
              {nextLabel}
            </a>
          ) : (
            <button type="button" disabled>
              {nextLabel}
            </button>
          )}
        </nav>
      )}
    </>
  );
}
