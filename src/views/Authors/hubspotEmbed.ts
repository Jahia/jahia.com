import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

const scriptFormat = /^https:\/\/js(?:-eu1)?\.hsforms\.net\/forms\/embed\/(?:v2|\d{1,16})\.js$/;
const formIdFormat = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

interface Configuration {
  portalId: string;
  formId: string;
  region: string;
}

type HubspotEmbed = Configuration & {
  format: "current" | "legacy";
  scriptUrl: string;
};

function valid({ portalId, formId, region }: Configuration) {
  return /^\d{1,16}$/.test(portalId) && formIdFormat.test(formId) && /^(na1|eu1)$/.test(region);
}

function collectElements(
  nodes: DefaultTreeAdapterMap["childNode"][],
): DefaultTreeAdapterMap["element"][] {
  return nodes.flatMap((node) =>
    "tagName" in node && node.tagName !== "template"
      ? [node, ...collectElements(node.childNodes)]
      : [],
  );
}

export function parseHubspotEmbed(code: string): HubspotEmbed | undefined {
  if (!code.trim()) return;
  const elements = collectElements(parseFragment(code).childNodes);
  const scripts = elements.filter((node) => node.tagName === "script");
  const frame = elements.find(
    (node) =>
      node.tagName === "div" &&
      node.attrs.some(
        ({ name, value }) => name === "class" && value.split(/\s+/).includes("hs-form-frame"),
      ),
  );
  const source = scripts.flatMap((tag) =>
    tag.attrs.flatMap(({ name, value }) => {
      if (name !== "src") return [];
      const raw = value.startsWith("//") ? "https:" + value : value;
      return scriptFormat.test(raw) ? [raw] : [];
    }),
  );
  if (frame) {
    const attrs = Object.fromEntries(frame.attrs.map(({ name, value }) => [name, value]));
    const config = {
      region: attrs["data-region"],
      portalId: attrs["data-portal-id"],
      formId: attrs["data-form-id"],
    };
    const script = source.find((url) => url.endsWith("/forms/embed/" + config.portalId + ".js"));
    if (valid(config) && script) return { ...config, format: "current", scriptUrl: script };
    return;
  }

  const script = source.find((url) => url.endsWith("/forms/embed/v2.js"));
  if (!script) return;
  const inline = scripts
    .flatMap((tag) => tag.childNodes)
    .filter((node) => "value" in node)
    .map((node) => node.value)
    .join("");
  const fields = /^\s*hbspt\.forms\.create\(\s*\{([^{}]*)\}\s*\);?\s*$/.exec(inline)?.[1];
  if (!fields) return;
  const values = Object.fromEntries(
    [
      ...fields.matchAll(
        /(?:^|,)\s*["']?(portalId|formId|region)["']?\s*:\s*["']([\w-]+)["']\s*(?=,|$)/g,
      ),
    ].map(([, key, value]) => [key, value]),
  );
  const config = {
    portalId: values.portalId,
    formId: values.formId,
    region: values.region ?? (script.includes("js-eu1.hsforms.net") ? "eu1" : "na1"),
  };
  if (valid(config)) return { ...config, format: "legacy", scriptUrl: script };
}
