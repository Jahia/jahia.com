import { validateUpperBar } from "./upperBar.js";
/**
 * @typedef {{kind:'preset',name:'cms'|'dxp'|'ai'}|{kind:'image',id:string}|null} NavigationIcon
 * @typedef {{mode:'automatic'|'selected'|'link'|'hidden',columnCount:number,columns:Record<string,number>,selected:string[],excluded:string[],direct:string[],labels:Record<string,Record<string,string>>,icons?:Record<string,NavigationIcon>,weights?:Record<string,"bold"|"normal">,order?:Record<string,string[]>,childOrder?:Record<string,string[]>,discover:{visible:boolean,labels:Record<string,string>,target?:string},feature?:{visible:boolean,eyebrow:Record<string,string>,heading:Record<string,string>,text:Record<string,string>,label:Record<string,string>,target?:string}}} SectionSettings
 * @typedef {{version:1,mode:'automatic'|'legacy',sections:Record<string,SectionSettings>,upperBar?:import('./upperBar.js').UpperBarSettings}} NavigationSettings
 */

/** @returns {SectionSettings} */
export function emptySection() {
  return {
    mode: "automatic",
    columnCount: 2,
    columns: {},
    selected: [],
    excluded: [],
    direct: [],
    labels: {},
    discover: { visible: false, labels: {} },
  };
}

/** @param {unknown} input @returns {NavigationSettings} */
export function validateSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("Invalid navigation configuration");
  const value = /** @type {NavigationSettings} */ (input);
  if (
    value.version !== 1 ||
    !["automatic", "legacy"].includes(value.mode) ||
    !value.sections ||
    typeof value.sections !== "object" ||
    Array.isArray(value.sections)
  )
    throw Error("Invalid navigation configuration version");
  const validId = (/** @type {string} */ id) =>
    typeof id === "string" &&
    /^[\w-]{1,100}$/.test(id) &&
    !["__proto__", "constructor", "prototype"].includes(id);
  const labels = (/** @type {Record<string,string>} */ map) => {
    if (!map || typeof map !== "object" || Array.isArray(map))
      throw Error("Invalid translated label");
    for (const [language, label] of Object.entries(map))
      if (
        !/^[a-z]{2}(?:[-_][A-Za-z]{2})?$/.test(language) ||
        typeof label !== "string" ||
        label.length > 4000
      )
        throw Error("Invalid translated label");
  };
  if (Object.keys(value.sections).length > 100) throw Error("Too many navigation sections");
  for (const [id, section] of Object.entries(value.sections)) {
    if (
      !validId(id) ||
      !section ||
      !["automatic", "selected", "link", "hidden"].includes(section.mode) ||
      !Number.isInteger(section.columnCount) ||
      section.columnCount < 1 ||
      section.columnCount > 4
    )
      throw Error("Invalid section");
    for (const list of [section.selected, section.excluded, section.direct])
      if (!Array.isArray(list) || list.length > 2000 || list.some((key) => !validId(key)))
        throw Error("Invalid page selection");
    if (
      !section.columns ||
      typeof section.columns !== "object" ||
      Array.isArray(section.columns) ||
      !section.labels ||
      typeof section.labels !== "object" ||
      Array.isArray(section.labels)
    )
      throw Error("Invalid column configuration");
    for (const [key, column] of Object.entries(section.columns))
      if (!validId(key) || !Number.isInteger(column) || column < 1 || column > section.columnCount)
        throw Error("Invalid column assignment");
    for (const [key, map] of Object.entries(section.labels)) {
      if (!validId(key)) throw Error("Invalid page label");
      labels(map);
    }
    if (section.weights !== undefined) {
      if (
        !section.weights ||
        typeof section.weights !== "object" ||
        Array.isArray(section.weights) ||
        Object.keys(section.weights).length > 2000
      )
        throw Error("Invalid label weight");
      for (const [key, weight] of Object.entries(section.weights))
        if (!validId(key) || !["bold", "normal"].includes(weight))
          throw Error("Invalid label weight");
    }
    if (section.icons !== undefined) {
      if (
        !section.icons ||
        typeof section.icons !== "object" ||
        Array.isArray(section.icons) ||
        Object.keys(section.icons).length > 2000
      )
        throw Error("Invalid icon configuration");
      for (const [key, icon] of Object.entries(section.icons)) {
        if (
          !validId(key) ||
          (icon !== null &&
            (!icon ||
              typeof icon !== "object" ||
              Array.isArray(icon) ||
              !(icon.kind === "preset"
                ? ["cms", "dxp", "ai"].includes(icon.name)
                : icon.kind === "image" && validId(icon.id))))
        )
          throw Error("Invalid navigation icon");
      }
    }
    if (section.order !== undefined) {
      if (!section.order || typeof section.order !== "object" || Array.isArray(section.order))
        throw Error("Invalid branch order");
      for (const [column, ids] of Object.entries(section.order)) {
        if (
          !/^[1-4]$/.test(column) ||
          !Array.isArray(ids) ||
          ids.length > 2000 ||
          ids.some((id) => !validId(id)) ||
          new Set(ids).size !== ids.length
        )
          throw Error("Invalid branch order");
      }
    }
    if (section.childOrder !== undefined) {
      if (
        !section.childOrder ||
        typeof section.childOrder !== "object" ||
        Array.isArray(section.childOrder) ||
        Object.keys(section.childOrder).length > 2000
      )
        throw Error("Invalid child order");
      for (const [parent, ids] of Object.entries(section.childOrder)) {
        if (
          !validId(parent) ||
          !Array.isArray(ids) ||
          ids.length > 2000 ||
          ids.some((id) => !validId(id)) ||
          new Set(ids).size !== ids.length
        )
          throw Error("Invalid child order");
      }
    }
    if (
      !section.discover ||
      typeof section.discover.visible !== "boolean" ||
      (section.discover.target && !validId(section.discover.target))
    )
      throw Error("Invalid overview settings");
    labels(section.discover.labels);
    if (section.feature) {
      if (
        typeof section.feature.visible !== "boolean" ||
        (section.feature.target && !validId(section.feature.target))
      )
        throw Error("Invalid feature settings");
      for (const map of [
        section.feature.eyebrow,
        section.feature.heading,
        section.feature.text,
        section.feature.label,
      ])
        labels(map);
    }
  }
  if (value.upperBar !== undefined) validateUpperBar(value.upperBar);
  return value;
}

/** @param {string | undefined | null} raw @returns {NavigationSettings | undefined} */
export function decodeSettings(raw) {
  if (!raw) return undefined;
  if (raw.length > 500000) throw Error("Navigation configuration too large");
  return validateSettings(JSON.parse(raw));
}

/** @param {string | undefined | null} raw @returns {NavigationSettings | undefined} */
export function safeSettings(raw) {
  try {
    return decodeSettings(raw);
  } catch {
    return undefined;
  }
}
