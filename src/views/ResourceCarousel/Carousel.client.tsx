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
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const measure = useCallback(() => {
    const element = viewport.current;
    if (!element) return;

    const count = Math.max(1, Math.ceil(element.scrollWidth / element.clientWidth));
    setPageCount(count);
    setPage(Math.min(count - 1, Math.round(element.scrollLeft / Math.max(1, element.clientWidth))));
  }, []);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const onScroll = () => requestAnimationFrame(measure);
    element.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", onScroll);
    };
  }, [measure, itemCount]);

  const goTo = (target: number) => {
    const element = viewport.current;
    if (!element) return;
    element.scrollTo({ left: target * element.clientWidth, behavior: "smooth" });
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
