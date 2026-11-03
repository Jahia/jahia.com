import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { useTranslation } from "react-i18next";
import classes from "./component.module.css";

import { paginationMetrics } from "./pagination.js";

export default function Carousel({
  children,
  itemCount,
  fitItems = false,
  showArrows = true,
  showPagination = true,
  labelledBy,
  layout,
}: {
  children?: ReactNode;
  itemCount: number;
  fitItems?: boolean;
  showArrows?: boolean;
  showPagination?: boolean;
  labelledBy?: string;
  layout?: { desktop: number; tablet: number; gap: string };
}) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const activePageRef = useRef(0);
  const targetPageRef = useRef<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const measure = useCallback(() => {
    const element = viewportRef.current;
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

    if (targetPageRef.current !== null) {
      const safeTarget = Math.min(targetPageRef.current, offsets.length - 1);
      if (Math.abs(offsets[safeTarget] - element.scrollLeft) > 1) return;
      targetPageRef.current = null;
    }

    activePageRef.current = closestPage;
    setPage(closestPage);
  }, [itemCount]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      // A pending destination belongs to the old layout after a breakpoint change.
      targetPageRef.current = null;
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
    const element = viewportRef.current;
    if (!element) return;
    const { offsets } = paginationMetrics(element, itemCount);
    const safeTarget = Math.max(0, Math.min(target, offsets.length - 1));
    targetPageRef.current = safeTarget;
    activePageRef.current = safeTarget;
    setPage(safeTarget);
    element.scrollTo({
      left: offsets[safeTarget],
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  const releaseTarget = () => {
    targetPageRef.current = null;
    requestAnimationFrame(measure);
  };

  return (
    <div
      className={classes.carousel}
      role="region"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : t("cardCarousel.defaultTitle")}
    >
      {showArrows && (
        <button
          className={`${classes.arrow} ${classes.previous}`}
          type="button"
          aria-label={t("cardCarousel.previous")}
          disabled={page === 0}
          onClick={() => goTo(activePageRef.current - 1)}
        >
          <span aria-hidden="true">←</span>
        </button>
      )}
      <div
        ref={viewportRef}
        data-fit-items={fitItems ? Math.max(1, Math.min(itemCount, 3)) : undefined}
        data-custom-layout={layout ? "" : undefined}
        style={
          layout
            ? ({
                "--carousel-desktop": Math.max(1, Math.min(itemCount, layout.desktop)),
                "--carousel-tablet": Math.max(
                  1,
                  Math.min(itemCount, layout.tablet, layout.desktop),
                ),
                "--carousel-gap": layout.gap,
              } as CSSProperties)
            : undefined
        }
        tabIndex={layout || !showArrows ? 0 : undefined}
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
          aria-label={t("cardCarousel.next")}
          disabled={page >= pageCount - 1}
          onClick={() => goTo(activePageRef.current + 1)}
        >
          <span aria-hidden="true">→</span>
        </button>
      )}
      {showPagination && pageCount > 1 && (
        <div className={classes.pagination} role="group" aria-label={t("cardCarousel.pagination")}>
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={t("cardCarousel.goToPage", { page: index + 1 })}
              aria-current={index === page ? "page" : undefined}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      )}
      <p className={classes.srOnly} role="status" aria-atomic="true">
        {pageCount > 1 ? t("cardCarousel.pageStatus", { page: page + 1, total: pageCount }) : ""}
      </p>
    </div>
  );
}
