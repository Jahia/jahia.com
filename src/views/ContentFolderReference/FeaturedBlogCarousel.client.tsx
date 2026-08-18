import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import classes from "./styles.module.css";

export default function FeaturedBlogCarousel({
  children,
  itemCount,
  carousel,
}: {
  children?: ReactNode;
  itemCount: number;
  carousel: boolean;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const carouselEnabled = carousel && itemCount > 1;
  const goTo = (index: number) => setActive(Math.max(0, Math.min(index, itemCount - 1)));
  const slideNumbers = Array.from({ length: itemCount }, (_, index) => index + 1);

  return (
    <section
      className={classes.featuredCarousel}
      aria-label={carouselEnabled ? t("blogListing.featuredCarousel") : undefined}
    >
      <div className={classes.featuredViewport}>
        <div
          className={classes.featuredTrack}
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {children}
        </div>
        {carouselEnabled && (
          <>
            <button
              className={`${classes.featuredArrow} ${classes.featuredPrevious}`}
              type="button"
              aria-label={t("blogListing.previousFeatured")}
              disabled={active === 0}
              onClick={() => goTo(active - 1)}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              className={`${classes.featuredArrow} ${classes.featuredNext}`}
              type="button"
              aria-label={t("blogListing.nextFeatured")}
              disabled={active === itemCount - 1}
              onClick={() => goTo(active + 1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        )}
      </div>
      {carouselEnabled && (
        <div className={classes.featuredDots} aria-label={t("blogListing.featuredCarousel")}>
          {slideNumbers.map((number) => (
            <button
              key={`featured-${number}`}
              type="button"
              aria-label={t("blogListing.goToFeatured", { number })}
              aria-current={number - 1 === active ? "true" : undefined}
              onClick={() => goTo(number - 1)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
