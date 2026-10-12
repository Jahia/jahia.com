export interface ResourceState {
  page: number;
  filters: Record<string, string>;
}

const memory = new Map<string, ResourceState>();
let legacyParameters: URLSearchParams | undefined;
const parameters = () => (legacyParameters ??= new URLSearchParams(window.location.search));
const validPage = (page: unknown) =>
  typeof page === "number" && Number.isSafeInteger(page) && page > 0 ? page : 1;
export const resourceStateKey = (id: string) =>
  `jahia:resources:v1:${window.location.pathname}:${id}`;

export const readResourceState = (id: string): ResourceState => {
  const key = resourceStateKey(id);
  const cached = memory.get(key);
  if (cached) return cached;
  let stored: Partial<ResourceState> | null = null;
  try {
    stored = JSON.parse(window.sessionStorage.getItem(key) || "null") || stored;
  } catch {
    // Storage can be unavailable or contain malformed data. Keep this page usable.
  }
  const filters = Object.fromEntries(
    Object.entries(stored?.filters || {}).filter(
      ([name, value]) => /^filter[12]$/.test(name) && typeof value === "string",
    ),
  );
  for (const name of ["filter1", "filter2"])
    if (parameters().has(name)) filters[name] = parameters().get(name) || "";
  const page = parameters().has("blogPage") ? Number(parameters().get("blogPage")) : stored?.page;
  return { page: validPage(page), filters };
};

export const saveResourceState = (id: string, patch: Partial<ResourceState>) => {
  const key = resourceStateKey(id);
  // Legacy parameters only seed the first restore, never override later interactions.
  const previous = memory.get(key) || readResourceState(id);
  const state = { ...previous, ...patch, page: validPage(patch.page ?? previous.page) };
  memory.set(key, state);
  try {
    window.sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // In-memory filtering and pagination still work when persistence is blocked.
  }
};

export const cleanResourceUrl = () => {
  parameters();
  const url = new URL(window.location.href);
  for (const name of ["blogPage", "filter1", "filter2", "cluster", "theme"])
    url.searchParams.delete(name);
  if (url.href !== window.location.href)
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
};

export const restoreResourceFilters = (container: ParentNode, id: string) => {
  const { filters } = readResourceState(id);
  for (const select of container.querySelectorAll<HTMLSelectElement>("select[name^=filter]")) {
    const value = filters[select.name] || "";
    select.value = [...select.options].some((option) => option.value === value) ? value : "";
  }
};

export const saveResourceFilters = (container: ParentNode, id: string, resetPage = false) => {
  const filters = Object.fromEntries(
    [...container.querySelectorAll<HTMLSelectElement>("select[name^=filter]")].map((select) => [
      select.name,
      select.value,
    ]),
  );
  saveResourceState(id, { filters, ...(resetPage ? { page: 1 } : {}) });
  cleanResourceUrl();
};
