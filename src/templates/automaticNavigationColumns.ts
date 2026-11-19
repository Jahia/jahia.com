import type { Entry, Page } from "./NavBar.types.js";
import { sortBranches } from "../../javascript/navigation/order.js";

/** Source branches stay together; optional per-column order only moves whole branches. */
export function automaticNavigationColumns(
  entries: Entry[],
  assignments: Record<string, number> = {},
  count = 2,
  order: Record<string, string[]> = {},
  childOrder: Record<string, string[]> = {},
): Page[][] {
  const columns: Page[][] = Array.from({ length: Math.max(1, Math.min(4, count)) }, () => []);
  const append = (entry: Entry, column: Page[], depth: number) => {
    if ("href" in entry) column.push({ ...entry, depth });
    else {
      if (entry.destination) column.push({ ...entry.destination, depth });
      for (const child of sortBranches(
        entry.children,
        childOrder[entry.id || ""] || [],
        (item) => item.id,
      ))
        append(child, column, entry.destination ? depth + 1 : depth);
    }
  };
  const branches: Entry[][] = columns.map(() => []);
  for (const branch of entries) {
    const index = Math.max(
      0,
      Math.min(columns.length - 1, (assignments[branch.id || ""] || 1) - 1),
    );
    branches[index].push(branch);
  }
  branches.forEach((items, index) => {
    for (const branch of sortBranches(items, order[String(index + 1)] || [], (item) => item.id))
      append(branch, columns[index], 0);
  });
  return columns;
}
