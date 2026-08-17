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
}: {
  children?: ReactNode;
  itemCount: number;
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

    const observer = new ResizeObserver(measure);
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
    element.scrollTo({ left: offsets[safeTarget], behavior: "smooth" });
  };

  const releaseTarget = () => {
    targetPage.current = null;
    requestAnimationFrame(measure);
  };

  return (
    <div className={classes.carousel}>
      <button
        className={`${classes.arrow} ${classes.previous}`}
        type="button"
        aria-label={t("resourceCarousel.previous")}
        disabled={page === 0}
        onClick={() => goTo(activePage.current - 1)}
      >
        <span aria-hidden="true">←</span>
      </button>
      <div
        ref={viewport}
        className={classes.viewport}
        onPointerDown={releaseTarget}
        onTouchStart={releaseTarget}
        onWheel={releaseTarget}
      >
        <div className={classes.track}>{children}</div>
      </div>
      <button
        className={`${classes.arrow} ${classes.next}`}
        type="button"
        aria-label={t("resourceCarousel.next")}
        disabled={page >= pageCount - 1}
        onClick={() => goTo(activePage.current + 1)}
      >
        <span aria-hidden="true">→</span>
      </button>
      {pageCount > 1 && (
        <div className={classes.pagination} aria-label={t("resourceCarousel.pagination")}>
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
    </div>
  );
}
