import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import classes from "./component.module.css";

export default function Carousel({
  children,
  itemCount,
}: {
  children?: ReactNode;
  itemCount: number;
}) {
  const { t } = useTranslation();
  const viewport = useRef<HTMLDivElement>(null);
  const pageOffsets = useRef([0]);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const measure = useCallback(() => {
    const element = viewport.current;
    if (!element) return;

    const track = element.firstElementChild as HTMLElement | null;
    const cards = track ? (Array.from(track.children) as HTMLElement[]) : [];
    if (!track || cards.length === 0) {
      pageOffsets.current = [0];
      setPageCount(1);
      setPage(0);
      return;
    }

    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const cardWidth = cards[0].getBoundingClientRect().width;
    const itemsPerPage = Math.max(
      1,
      Math.floor((element.clientWidth + gap + 0.5) / Math.max(1, cardWidth + gap)),
    );
    const count = Math.max(1, Math.ceil(itemCount / itemsPerPage));
    const viewportLeft = element.getBoundingClientRect().left;
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const offsets = Array.from({ length: count }, (_, index) => {
      const card = cards[Math.min(index * itemsPerPage, cards.length - 1)];
      const cardOffset = card.getBoundingClientRect().left - viewportLeft + element.scrollLeft;
      return Math.min(maxScroll, Math.max(0, cardOffset));
    });

    pageOffsets.current = offsets;
    setPageCount(count);
    setPage(
      offsets.reduce(
        (closest, offset, index) =>
          Math.abs(offset - element.scrollLeft) < Math.abs(offsets[closest] - element.scrollLeft)
            ? index
            : closest,
        0,
      ),
    );
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
    const safeTarget = Math.max(0, Math.min(target, pageOffsets.current.length - 1));
    element.scrollTo({ left: pageOffsets.current[safeTarget], behavior: "smooth" });
  };

  return (
    <div className={classes.carousel}>
      <button
        className={`${classes.arrow} ${classes.previous}`}
        type="button"
        aria-label={t("resourceCarousel.previous")}
        disabled={page === 0}
        onClick={() => goTo(page - 1)}
      >
        <span aria-hidden="true">←</span>
      </button>
      <div ref={viewport} className={classes.viewport}>
        <div className={classes.track}>{children}</div>
      </div>
      <button
        className={`${classes.arrow} ${classes.next}`}
        type="button"
        aria-label={t("resourceCarousel.next")}
        disabled={page >= pageCount - 1}
        onClick={() => goTo(page + 1)}
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
