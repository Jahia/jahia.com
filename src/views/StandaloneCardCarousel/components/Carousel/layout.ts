import type { CarouselProps } from "./types.js";

const boundedCount = (value: unknown, fallback: number, maximum: number) => {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= maximum ? count : fallback;
};

export const carouselLayout = (props: CarouselProps) => {
  const desktop = boundedCount(props.desktopCards, 3, 8);
  const spacing =
    props.cardSpacing === "compact" ? "1rem" : props.cardSpacing === "large" ? "2rem" : "1.5rem";
  return {
    desktop,
    tablet: Math.min(desktop, boundedCount(props.tabletCards, 2, 2)),
    gap: spacing,
  };
};
