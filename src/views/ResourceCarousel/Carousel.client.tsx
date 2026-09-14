import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import classes from "./component.module.css";

const paginationMetrics = (element: HTMLDivElement, itemCount: number) => {
  const track = element.firstElementChild as HTMLElement | null;
  const cards = track
    ? (Array.from(track.querySelectorAll("[data-carousel-item]")) as HTMLElement[])
    : [];
  const itemsPerPage =
    Number.parseInt(getComputedStyle(element).getPropertyValue("--items-per-page"), 10) || 3;
  const count = Math.max(1, Math.ceil(itemCount / itemsPerPage));
  const viewportLeft = element.getBoundingClientRect().left;
  const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
  const offsets = Array.from({ length: count }, (_, index) => {
    if (index === 0) return 0;

    const card = cards[index * itemsPerPage];
    const measuredOffset = card
      ? card.getBoundingClientRect().left - viewportLeft + element.scrollLeft
      : index * element.clientWidth;
    const cardOffset = measuredOffset > 0 ? measuredOffset : index * element.clientWidth;
    return Math.min(maxScroll, Math.max(0, cardOffset));
  });

  return { count, offsets };
};

export default function Carousel({
  children,
  itemCount,
  fitItems = false,
  showArrows = true,
  showPagination = true,
  labelledBy,
}: {
  children?: ReactNode;
  itemCount: number;
  fitItems?: boolean;
  showArrows?: boolean;
  showPagination?: boolean;
  labelledBy?: string;
}) {
  const { t } = useTranslation();
  const viewport = useRef<HTMLDivElement>(null);
  const activePage = useRef(0);
  const targetPage = useRef<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const measure = useCallback(() => {
    const element = viewport.current;
    if (!element) return;

    const { count, offsets } = paginationMetrics(element, itemCount);

    setPageCount(count);
    const closestPage = offsets.reduce(
      (closest, offset, index) =>
        Math.abs(offset - element.scrollLeft) < Math.abs(offsets[closest] - element.scrollLeft)
          ? index
          : closest,
      0,
    );

    if (targetPage.current !== null) {
      const safeTarget = Math.min(targetPage.current, offsets.length - 1);
      if (Math.abs(offsets[safeTarget] - element.scrollLeft) > 1) return;
      targetPage.current = null;
    }

    activePage.current = closestPage;
    setPage(closestPage);
  }, [itemCount]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      // A pending destination belongs to the old layout after a breakpoint change.
      targetPage.current = null;
      measure();
    });
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    const onScroll = () => requestAnimationFrame(measure);
    element.addEventListener("scroll", onScroll, { passive: true });
    const initialMeasurement = requestAnimationFrame(measure);

    return () => {
      cancelAnimationFrame(initialMeasurement);
      observer.disconnect();
      element.removeEventListener("scroll", onScroll);
    };
  }, [measure]);

  const goTo = (target: number) => {
    const element = viewport.current;
    if (!element) return;
    const { offsets } = paginationMetrics(element, itemCount);
    const safeTarget = Math.max(0, Math.min(target, offsets.length - 1));
    targetPage.current = safeTarget;
    activePage.current = safeTarget;
    setPage(safeTarget);
    element.scrollTo({
      left: offsets[safeTarget],
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  const releaseTarget = () => {
    targetPage.current = null;
    requestAnimationFrame(measure);
  };

  return (
    <div
      className={classes.carousel}
      role="region"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : t("resourceCarousel.defaultTitle")}
    >
      {showArrows && (
        <button
          className={`${classes.arrow} ${classes.previous}`}
          type="button"
          aria-label={t("resourceCarousel.previous")}
          disabled={page === 0}
          onClick={() => goTo(activePage.current - 1)}
        >
          <span aria-hidden="true">←</span>
        </button>
      )}
      <div
        ref={viewport}
        data-fit-items={fitItems ? Math.max(1, Math.min(itemCount, 3)) : undefined}
        tabIndex={showArrows ? undefined : 0}
        className={classes.viewport}
        onPointerDown={releaseTarget}
        onTouchStart={releaseTarget}
        onWheel={releaseTarget}
      >
        <div className={classes.track}>{children}</div>
      </div>
      {showArrows && (
        <button
          className={`${classes.arrow} ${classes.next}`}
          type="button"
          aria-label={t("resourceCarousel.next")}
          disabled={page >= pageCount - 1}
          onClick={() => goTo(activePage.current + 1)}
        >
          <span aria-hidden="true">→</span>
        </button>
      )}
      {showPagination && pageCount > 1 && (
        <div
          className={classes.pagination}
          role="group"
          aria-label={t("resourceCarousel.pagination")}
        >
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={t("resourceCarousel.goToPage", { page: index + 1 })}
              aria-current={index === page ? "page" : undefined}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      )}
      <p className={classes.srOnly} role="status" aria-atomic="true">
        {pageCount > 1
          ? t("resourceCarousel.pageStatus", { page: page + 1, total: pageCount })
          : ""}
      </p>
    </div>
  );
}
