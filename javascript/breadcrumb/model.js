/** @typedef {{version:1,enabled:boolean,homeLabels:Record<string,string>,labels:Record<string,Record<string,string>>,parents:Record<string,string>}} BreadcrumbSettings */
/** @returns {BreadcrumbSettings} */
export const defaults = () => ({
  version: 1,
  enabled: true,
  homeLabels: {},
  labels: {},
  parents: {},
});
const id = (/** @type {unknown} */ value) =>
  typeof value === "string" &&
  /^[\w-]{1,100}$/.test(value) &&
  !["__proto__", "constructor", "prototype"].includes(value);
/** @param {unknown} input @returns {BreadcrumbSettings} */
export function validate(input) {
  const value = /** @type {BreadcrumbSettings} */ (input);
  const object = (/** @type {unknown} */ item) =>
    item && typeof item === "object" && !Array.isArray(item);
  const labels = (/** @type {Record<string,string>} */ map) => {
    if (!object(map)) throw Error("Invalid breadcrumb labels");
    for (const [lang, label] of Object.entries(map))
      if (
        !/^[a-z]{2}(?:[-_][A-Za-z]{2})?$/.test(lang) ||
        typeof label !== "string" ||
        label.length > 250
      )
        throw Error("Invalid breadcrumb label");
  };
  if (
    !object(value) ||
    value.version !== 1 ||
    typeof value.enabled !== "boolean" ||
    !object(value.labels) ||
    !object(value.parents) ||
    Object.keys(value.labels).length > 2000 ||
    Object.keys(value.parents).length > 2000
  )
    throw Error("Invalid breadcrumb configuration");
  labels(value.homeLabels);
  for (const [key, map] of Object.entries(value.labels)) {
    if (!id(key)) throw Error("Invalid breadcrumb ID");
    labels(map);
  }
  for (const [key, target] of Object.entries(value.parents))
    if (!id(key) || !id(target)) throw Error("Invalid breadcrumb parent");
  return value;
}
/** @param {string | null | undefined} raw @returns {BreadcrumbSettings} */
export function decode(raw) {
  if (!raw) return defaults();
  if (raw.length > 500000) throw Error("Breadcrumb configuration too large");
  return validate(JSON.parse(raw));
}
