export function comparePressDates(left: number, right: number, oldest = false) {
  const a = Number.isFinite(left) ? left : 0;
  const b = Number.isFinite(right) ? right : 0;
  if (!a || !b) return Number(!a) - Number(!b);
  return oldest ? a - b : b - a;
}
