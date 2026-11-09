import { useEffect, useRef } from "react";

const filterNames = ["filter1", "filter2"] as const;
const stateKey = "jahiaBlogFilters";

export default function BlogFilterUrl() {
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const url = new URL(window.location.href);
    const history = window.history;
    const state = history.state;
    const saved = state?.[stateKey];

    if (filterNames.some((name) => url.searchParams.has(name))) {
      const filters = Object.fromEntries(
        filterNames.map((name) => [name, url.searchParams.get(name) || ""]),
      );
      for (const name of filterNames) url.searchParams.delete(name);
      history.replaceState({ ...state, [stateKey]: { path: url.pathname, filters } }, "", url);
      return;
    }

    // A fresh server render after reload needs the filters saved on this history entry.
    if (saved?.path !== url.pathname) return;
    for (const name of filterNames) {
      const value = saved.filters?.[name];
      if (typeof value === "string" && value) url.searchParams.set(name, value);
    }
    if (url.href !== window.location.href) window.location.replace(url);
  }, []);
  return null;
}
