import { sortBranches } from "./order.js";
/** Keep the source order and ancestry while assigning whole branches to columns. */
export function navigationRows(source) {
  const rows = [];
  const visit = (node, depth, branch, ancestors) => {
    rows.push({ node, depth, branch, ancestors });
    for (const child of node.children || [])
      visit(child, depth + 1, branch, [...ancestors, node.id]);
  };
  for (const branch of source.children || []) visit(branch, 0, branch.id, []);
  return rows;
}

export function assignedColumn(settings, branch) {
  return Math.max(1, Math.min(settings.columnCount, settings.columns[branch] || 1));
}

export function navigationColumnRows(rows, settings) {
  const children = new Map();
  for (const row of rows) {
    const parent = row.ancestors.at(-1);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(row);
  }
  const descendants = (row) => [
    row,
    ...sortBranches(
      children.get(row.node.id) || [],
      settings.childOrder?.[row.node.id] || [],
      (child) => child.node.id,
    ).flatMap(descendants),
  ];
  const columns = Array.from({ length: settings.columnCount }, () => []);
  for (const row of rows.filter((row) => row.depth === 0))
    columns[assignedColumn(settings, row.branch) - 1].push(row);
  return columns.map((column, index) => {
    return sortBranches(
      column,
      settings.order?.[String(index + 1)] || [],
      (row) => row.branch,
    ).flatMap(descendants);
  });
}
