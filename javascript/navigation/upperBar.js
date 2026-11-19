/** @typedef {{key:string,kind:'internal'|'external'|'rss'|'search'|'languages',visible:boolean,id?:string,url?:string,labels:Record<string,string>}} UpperItem */
/** @typedef {{key:'contact'|'demo',visible:boolean,target?:string,targets?:Record<string,string>,labels:Record<string,string>,style:'primary'|'secondary',placement:'main'|'upper'}} UpperButton */
/** @typedef {{items:UpperItem[],buttons:UpperButton[],rss:{url:string,labels:Record<string,string>,image?:string}}} UpperBarSettings */

/** @param {unknown} value */
const validId = (value) =>
  typeof value === "string" &&
  /^[\w-]{1,100}$/.test(value) &&
  !["__proto__", "prototype", "constructor"].includes(value);
/** @param {unknown} value */
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
/** @param {Record<string,string>} map */
const labelsValid = (map) =>
  object(map) &&
  Object.entries(map).every(
    ([lang, label]) =>
      /^[a-z]{2}(?:[-_][A-Za-z]{2})?$/.test(lang) &&
      typeof label === "string" &&
      label.length <= 4000,
  );
/** @param {string|undefined} value */
export function upperBarUrl(value, relative = false) {
  // eslint-disable-next-line no-control-regex -- Reject control characters in editorial URLs.
  if (typeof value !== "string" || value.length > 4000 || /[\s\\\u0000-\u001f\u007f]/.test(value))
    return undefined;
  if (relative && /^\/(?!\/)/.test(value)) return value;
  if (!/^https?:\/\/[^\s/]+(?:[/?#][^\s]*)?$/i.test(value)) return undefined;
  const authority = value.replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  return /^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::[0-9]{1,5})?$/i.test(authority) ? value : undefined;
}
/** @param {UpperBarSettings} value */
export function validateUpperBar(value) {
  if (
    !object(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 40 ||
    !Array.isArray(value.buttons) ||
    value.buttons.length > 2 ||
    !object(value.rss) ||
    !labelsValid(value.rss.labels) ||
    typeof value.rss.url !== "string" ||
    (value.rss.url && !upperBarUrl(value.rss.url, true)) ||
    (value.rss.image && !validId(value.rss.image))
  )
    throw Error("Invalid upper navigation");
  const keys = new Set(),
    tools = new Set();
  for (const item of value.items) {
    if (
      !object(item) ||
      !validId(item.key) ||
      keys.has(item.key) ||
      !["internal", "external", "rss", "search", "languages"].includes(item.kind) ||
      typeof item.visible !== "boolean" ||
      !labelsValid(item.labels) ||
      (item.kind === "internal" && item.id !== undefined && !validId(item.id)) ||
      (item.kind === "external" &&
        (typeof item.url !== "string" || (item.url && !upperBarUrl(item.url))))
    )
      throw Error("Invalid upper navigation item");
    keys.add(item.key);
    if (!["internal", "external"].includes(item.kind)) {
      if (tools.has(item.kind)) throw Error("Duplicate upper navigation tool");
      tools.add(item.kind);
    }
  }
  const buttons = new Set();
  for (const button of value.buttons) {
    if (
      !object(button) ||
      !["contact", "demo"].includes(button.key) ||
      buttons.has(button.key) ||
      typeof button.visible !== "boolean" ||
      (button.target !== undefined && !validId(button.target)) ||
      !labelsValid(button.labels) ||
      (button.targets !== undefined &&
        (!labelsValid(button.targets) ||
          Object.values(button.targets).some((id) => id && !validId(id)))) ||
      !["primary", "secondary"].includes(button.style) ||
      !["main", "upper"].includes(button.placement)
    )
      throw Error("Invalid navigation button");
    buttons.add(button.key);
  }
  return value;
}
/** @typedef {{native:Record<string,any>,fr:Record<string,string>,en:Record<string,string>}} SeedNode */
/** @param {SeedNode} node @param {string} property */
const translated = (node, property) =>
  Object.fromEntries(
    ["fr", "en"].map((lang) => [lang, node?.[/** @type {"fr"|"en"} */ (lang)]?.[property] || ""]),
  );
/** @param {any} value @returns {any[]} */
const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);
/** Read-only compatibility seed; opening the editor never stores an override.
 * @param {SeedNode} home @param {SeedNode} site @param {{href?:string}} footerRss
 */
export function seedUpperBar(home, site, footerRss = {}) {
  const root = home?.native || {},
    global = site?.native || {};
  const hasMixin = (/** @type {string} */ mixin) => list(root["jcr:mixinTypes"]).includes(mixin);
  const utility = hasMixin("jahiacommix:homeUtilityNavigation") ? root : global;
  let stored;
  try {
    stored = JSON.parse(root.utilityItemsData);
  } catch {
    /* Legacy lists remain supported. */
  }
  const legacy = [
    { kind: "links", position: Number(utility.utilityLinksPosition ?? 10) },
    { kind: "rss", position: Number(utility.utilityRssPosition ?? 20) },
    { kind: "search", position: Number(utility.utilitySearchPosition ?? 30) },
    { kind: "languages", position: Number(utility.utilityLanguagesPosition ?? 40) },
  ]
    .sort((a, b) => a.position - b.position)
    .flatMap((row) =>
      row.kind === "links"
        ? list(utility.utilityNavigationLinks).map((id) => ({ kind: "internal", id }))
        : [{ kind: row.kind }],
    );
  const seenTools = new Set();
  const items = (Array.isArray(stored) ? stored : legacy).flatMap((row, index) => {
    if (!row || !["internal", "external", "rss", "search", "languages"].includes(row.kind))
      return [];
    if (!["internal", "external"].includes(row.kind)) {
      if (seenTools.has(row.kind)) return [];
      seenTools.add(row.kind);
    }
    const labels =
      row.kind === "search"
        ? translated(home, "utilitySearchLabel")
        : row.kind === "languages"
          ? translated(home, "utilityLanguagesLabel")
          : row.kind === "rss"
            ? translated(home, "utilityRssLabel")
            : row.labels || {};
    const visible =
      row.kind === "rss"
        ? root.utilityRssVisible === undefined
          ? !!footerRss.href
          : root.utilityRssVisible !== "false"
        : !["search", "languages"].includes(row.kind) ||
          root[row.kind === "search" ? "utilitySearchVisible" : "utilityLanguagesVisible"] !==
            "false";
    if (row.kind === "internal" && !validId(row.id)) return [];
    if (row.kind === "external" && !upperBarUrl(row.url)) return [];
    return [
      {
        key: "item-" + index,
        kind: row.kind,
        visible,
        labels,
        ...(row.kind === "internal" ? { id: row.id } : {}),
        ...(row.kind === "external" ? { url: row.url } : {}),
      },
    ];
  });
  const source = hasMixin("jahiacommix:homeNavbarButtons") ? home : site;
  let buttons = ["contact", "demo"].map((key) => {
    const prefix = key === "contact" ? "secondaryCTA" : "primaryCTA";
    const targets = translated(source, prefix + "Link");
    // Reference fields are translated; keep both destinations for the corresponding language.
    return {
      key,
      visible: !!(targets.fr || targets.en),
      targets,
      labels: translated(source, prefix + "Label"),
      style:
        root[prefix + "Style"] === "primary"
          ? "primary"
          : root[prefix + "Style"] === "secondary"
            ? "secondary"
            : key === "contact"
              ? "secondary"
              : "primary",
      placement: root[prefix + "Placement"] === "upper" ? "upper" : "main",
    };
  });
  if (root.navbarCTAOrder === "demoContact") buttons.reverse();
  const result = {
    items,
    buttons,
    rss: {
      url: root.utilityRssVisible === undefined ? footerRss.href || "" : root.utilityRssUrl || "",
      labels: translated(home, "utilityRssLabel"),
      ...(root.utilityRssImage ? { image: root.utilityRssImage } : {}),
    },
  };
  return result;
}
/** Shared public/preview projection. Internal references are resolved in the current session.
 * @param {UpperBarSettings} value @param {string} language
 * @param {(id:string,label?:string)=>import("../../src/templates/NavBar.types.js").Page|undefined} page
 * @param {(id:string)=>string|undefined} image
 */
export function projectUpperBar(value, language, page, image = () => undefined) {
  validateUpperBar(value);
  const fr = language === "fr",
    label = (/** @type {Record<string,string>} */ map, fallback = "") =>
      map[language]?.trim() || fallback;
  const tool = (/** @type {string} */ kind) =>
    value.items.find((item) => item.kind === kind && item.visible);
  const controls = {
    searchVisible: !!tool("search"),
    searchLabel: label(tool("search")?.labels || {}, fr ? "Rechercher" : "Search"),
    languagesVisible: !!tool("languages"),
    languagesLabel: label(
      tool("languages")?.labels || {},
      fr ? "Choisir la langue" : "Choose language",
    ),
  };
  const utilityEntries = value.items.flatMap(
    /** @returns {import("../../src/templates/NavBar.types.js").UtilityEntry[]} */ (item) => {
      if (!item.visible) return [];
      if (item.kind === "internal") {
        const link = item.id && page(item.id, label(item.labels, undefined));
        return link ? [link] : [];
      }
      if (item.kind === "external") {
        const title = label(item.labels, item.labels.en?.trim() || item.labels.fr?.trim() || "");
        const href = upperBarUrl(item.url);
        return title && href ? [{ title, href, current: false }] : [];
      }
      return [{ kind: item.kind }];
    },
  );
  const buttons = value.buttons.flatMap((button) => {
    if (!button.visible) return [];
    const target = button.targets?.[language] || button.target;
    const link = target && page(target, label(button.labels, undefined));
    return link
      ? [
          {
            id: button.key,
            href: link.href,
            label: link.title,
            style: button.style,
            placement: button.placement,
          },
        ]
      : [];
  });
  const rssLabel = label(tool("rss")?.labels || value.rss.labels, fr ? "Flux RSS" : "RSS feed");
  const rss = tool("rss")
    ? {
        href: upperBarUrl(value.rss.url, true),
        label: rssLabel,
        pendingLabel: rssLabel + " — " + (fr ? "bientôt disponible" : "coming soon"),
        image: value.rss.image ? image(value.rss.image) : undefined,
      }
    : undefined;
  return { utilityEntries, controls, buttons, rss };
}
