/** @template T @param {T[]} items @param {string[]} order @param {(item:T)=>string|undefined} getId @returns {T[]} */
export function sortBranches(items, order, getId) {
  const ranks = new Map(order.map((id, index) => [id, index]));
  return items
    .map((item, index) => ({ item, index, rank: ranks.get(getId(item) || "") ?? Infinity }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item);
}
