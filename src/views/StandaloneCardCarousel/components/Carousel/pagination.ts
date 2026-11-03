export const paginationMetrics = (element: HTMLDivElement, itemCount: number) => {
  const track = element.firstElementChild as HTMLElement | null;
  const candidates = track
    ? (Array.from(track.querySelectorAll("[data-carousel-item]")) as HTMLElement[])
    : [];
  // Nested carousels must not contribute slides to their parent carousel.
  const cards = candidates.filter((card) => card.parentElement === candidates[0]?.parentElement);
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
