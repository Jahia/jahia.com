/** The URL is authoritative for crawlable blog pagination. */
export const blogPage = (value: string | null | undefined) => {
  if (!value || !/^[1-9]\d{0,8}$/.test(value)) return 1;
  return Number(value);
};
export const blogPageSize = (value?: string) => {
  const size = Number(value || "12");
  return [6, 12, 18, 24].includes(size) ? size : 12;
};
export const paginateBlog = <T>(items: T[], size: number, requested: number) => {
  const count = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(1, requested), count);
  return { page, count, items: items.slice((page - 1) * size, page * size) };
};
export const blogPageUrl = (base: string, page: number, filters: Record<string, string> = {}) => {
  const parameters = [
    ...(page > 1 ? [["blogPage", String(page)]] : []),
    ...Object.entries(filters).filter(([name, value]) => /^filter[12]$/.test(name) && value),
  ];
  return (
    base.split(/[?#]/)[0] +
    (parameters.length
      ? "?" +
        parameters
          .map(([name, value]) => encodeURIComponent(name) + "=" + encodeURIComponent(value))
          .join("&")
      : "")
  );
};

/** Match the native SEO module's preferred sitemap domain when configured. */
export const blogCanonicalOrigin = (preferred: string | null | undefined, fallback: string) =>
  preferred?.match(/^https?:\/\/[^/?#@]+(?=[/?#]|$)/i)?.[0] || fallback.replace(/\/$/, "");
