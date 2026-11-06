/** One pending hover action; leaving, clicking or Escape cancels stale openings. */
export function createHoverIntent(apply: (index: number | null) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return {
    cancel,
    schedule(index: number | null, switching = false) {
      cancel();
      timer = setTimeout(
        () => {
          timer = undefined;
          apply(index);
        },
        index === null ? 250 : switching ? 100 : 300,
      );
    },
  };
}
