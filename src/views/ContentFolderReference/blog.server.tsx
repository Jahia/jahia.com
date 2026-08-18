import {
  Island,
  jahiaComponent,
  Render,
  server,
  useJCRQuery,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import FeaturedBlogCarousel from "./FeaturedBlogCarousel.client.jsx";
import classes from "./styles.module.css";

interface Props {
  "j:node"?: JCRNodeWrapper;
  "blogPageSize"?: string;
  "featuredArticle"?: JCRNodeWrapper;
  "featuredArticles"?: Array<JCRNodeWrapper | null>;
  "featuredIncludeUpdatedArticles"?: boolean;
  "blogFilterClusters"?: Array<JCRNodeWrapper | null>;
  "blogFilterThemes"?: Array<JCRNodeWrapper | null>;
}

type FilterOption = { id: string; label: string; node: JCRNodeWrapper };
const pageSizes = new Set([6, 12, 18, 24]);
const contentTypeNames = [
  "whitepaper",
  "white-paper",
  "livre-blanc",
  "webinar",
  "webinaire",
  "video",
  "vidéo",
  "infographic",
  "infographie",
  "customer-case",
  "case-study",
  "cas-client",
];

const sanitizePageSize = (value?: string) => {
  const parsed = Number.parseInt(value || "12", 10);
  return pageSizes.has(parsed) ? parsed : 12;
};

const referencedNodes = (entry: JCRNodeWrapper, propertyName: string) => {
  if (!entry.hasProperty(propertyName)) return [];
  const property = entry.getProperty(propertyName);
  const values = property.isMultiple() ? property.getValues() : [property.getValue()];
  return values
    .map((value) => value.getNode() as JCRNodeWrapper | null)
    .filter((node): node is JCRNodeWrapper => node !== null);
};

const optionsFromEntries = (entries: JCRNodeWrapper[], propertyName: string, thematic = false) => {
  const options = new Map<string, FilterOption>();
  for (const entry of entries) {
    for (const node of referencedNodes(entry, propertyName)) {
      const label = node.getDisplayableName();
      const normalized = `${node.getName()} ${label}`.toLocaleLowerCase().replaceAll("_", "-");
      if (thematic && contentTypeNames.some((name) => normalized.includes(name))) continue;
      options.set(node.getIdentifier(), { id: node.getIdentifier(), label, node });
    }
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
};

const hasReference = (entry: JCRNodeWrapper, propertyName: string, id: string) =>
  referencedNodes(entry, propertyName).some((node) => node.getIdentifier() === id);

const configuredNodes = (nodes?: Array<JCRNodeWrapper | null>) =>
  (nodes || []).filter((node): node is JCRNodeWrapper => node !== null);

const restrictOptions = (options: FilterOption[], configured: JCRNodeWrapper[]) => {
  if (configured.length === 0) return options;
  const allowedIds = new Set(configured.map((node) => node.getIdentifier()));
  return options.filter(({ id }) => allowedIds.has(id));
};

const timestamp = (entry: JCRNodeWrapper, propertyName: string) => {
  if (!entry.hasProperty(propertyName)) return 0;
  const value = Date.parse(entry.getPropertyAsString(propertyName));
  return Number.isFinite(value) ? value : 0;
};

const usesLastModifiedDate = (entry: JCRNodeWrapper) =>
  entry.hasProperty("useLastModifiedDate") && entry.getProperty("useLastModifiedDate").getBoolean();

const effectiveFeaturedTimestamp = (entry: JCRNodeWrapper) =>
  usesLastModifiedDate(entry)
    ? timestamp(entry, "jcr:lastModified") || timestamp(entry, "date")
    : timestamp(entry, "date");

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jnt:contentFolderReference",
    name: "blog",
    properties: { "cache.requestParameters": "cluster,theme,blogPage" },
  },
  (
    {
      "j:node": folder,
      blogPageSize,
      featuredArticle,
      featuredArticles,
      featuredIncludeUpdatedArticles,
      blogFilterClusters,
      blogFilterThemes,
    }: Props,
    { renderContext },
  ) => {
    const { t } = useTranslation();
    if (folder)
      server.render.addCacheDependency(
        { flushOnPathMatchingRegexp: `${folder.getPath()}/.*` },
        renderContext,
      );
    if (!folder) return null;

    const entries = useJCRQuery({
      query: `SELECT * FROM [jahiacom:blogEntry] WHERE ISDESCENDANTNODE(${JSON.stringify(folder.getPath())}) ORDER BY [date] DESC`,
    });
    if (renderContext.isEditMode())
      return (
        <div>
          {entries.map((entry) => (
            <Render key={entry.getIdentifier()} node={entry} />
          ))}
        </div>
      );
    if (entries.length === 0) return null;

    const configuredArticles = configuredNodes(featuredArticles);
    const entriesById = new Map(entries.map((entry) => [entry.getIdentifier(), entry]));
    const configuredEntries = [
      ...new Map(
        configuredArticles
          .map((node) => entriesById.get(node.getIdentifier()))
          .filter((entry): entry is JCRNodeWrapper => entry !== undefined)
          .map((entry) => [entry.getIdentifier(), entry]),
      ).values(),
    ];
    const legacyFeaturedEntry = featuredArticle
      ? entriesById.get(featuredArticle.getIdentifier())
      : undefined;
    const usesManualFeatured = configuredArticles.length === 3 && configuredEntries.length === 3;
    const usesLegacyFeatured = configuredArticles.length === 0 && legacyFeaturedEntry !== undefined;
    const featuredEntries = usesManualFeatured
      ? configuredEntries
      : legacyFeaturedEntry && usesLegacyFeatured
        ? [legacyFeaturedEntry]
        : (featuredIncludeUpdatedArticles
            ? [...entries].sort(
                (first, second) =>
                  effectiveFeaturedTimestamp(second) - effectiveFeaturedTimestamp(first),
              )
            : entries
          ).slice(0, 3);
    const featuredIds = new Set(featuredEntries.map((entry) => entry.getIdentifier()));
    const regularEntries = entries.filter((entry) => !featuredIds.has(entry.getIdentifier()));
    const configuredClusters = configuredNodes(blogFilterClusters);
    const configuredThemes = configuredNodes(blogFilterThemes);
    const clusterOptions = restrictOptions(
      optionsFromEntries(entries, "blogType"),
      configuredClusters,
    );
    const themeOptions = restrictOptions(
      optionsFromEntries(entries, "j:defaultCategory", true),
      configuredThemes,
    );
    const request = renderContext.getRequest();
    const requestedCluster = request.getParameter("cluster");
    const requestedTheme = request.getParameter("theme");
    const selectedCluster = clusterOptions.some(({ id }) => id === requestedCluster)
      ? requestedCluster
      : "all";
    const selectedTheme = themeOptions.some(({ id }) => id === requestedTheme)
      ? requestedTheme
      : "all";
    const filteredEntries = regularEntries.filter(
      (entry) =>
        (selectedCluster === "all" || hasReference(entry, "blogType", selectedCluster)) &&
        (selectedTheme === "all" || hasReference(entry, "j:defaultCategory", selectedTheme)),
    );
    const pageSize = sanitizePageSize(blogPageSize);
    const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
    const requestedPage = Number.parseInt(request.getParameter("blogPage") || "1", 10);
    const page = Math.min(
      Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
      pageCount,
    );
    const visibleEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize);
    const filterQuery = [
      selectedCluster !== "all" && `cluster=${encodeURIComponent(selectedCluster)}`,
      selectedTheme !== "all" && `theme=${encodeURIComponent(selectedTheme)}`,
    ].filter(Boolean);
    const pageUrl = (target: number) => `?${[...filterQuery, `blogPage=${target}`].join("&")}`;
    const filterDependencies = new Map(
      [
        ...clusterOptions.map(({ node }) => node),
        ...themeOptions.map(({ node }) => node),
        ...configuredClusters,
        ...configuredThemes,
      ].map((node) => [node.getIdentifier(), node]),
    );
    for (const node of filterDependencies.values())
      server.render.addCacheDependency({ path: node.getPath() }, renderContext);

    return (
      <section className={classes.blogListing}>
        <Island
          component={FeaturedBlogCarousel}
          props={{ itemCount: featuredEntries.length, carousel: !usesLegacyFeatured }}
        >
          {featuredEntries.map((entry) => (
            <div key={entry.getIdentifier()} className={classes.featuredSlide}>
              <Render node={entry} view="featured" />
            </div>
          ))}
        </Island>
        <form className={classes.filterForm} method="get">
          <label>
            <span>{t("blogListing.cluster")}</span>
            <select name="cluster" defaultValue={selectedCluster}>
              <option value="all">{t("blogListing.allClusters")}</option>
              {clusterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("blogListing.theme")}</span>
            <select name="theme" defaultValue={selectedTheme}>
              <option value="all">{t("blogListing.allThemes")}</option>
              {themeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className={classes.filterActions}>
            <button type="submit">{t("blogListing.applyFilters")}</button>
            <a href="?">{t("blogListing.resetFilters")}</a>
          </div>
        </form>
        {visibleEntries.length > 0 ? (
          <div className={classes.grid}>
            {visibleEntries.map((entry) => (
              <div key={entry.getIdentifier()} className={classes.cardSlot}>
                <Render node={entry} />
              </div>
            ))}
          </div>
        ) : (
          <p className={classes.empty}>{t("blogListing.noResults")}</p>
        )}
        {pageCount > 1 && (
          <nav className={classes.pagination} aria-label={t("blogListing.pagination")}>
            {page > 1 && <a href={pageUrl(page - 1)}>{t("blogListing.previousPage")}</a>}
            <span>{t("blogListing.pageCount", { page, count: pageCount })}</span>
            {page < pageCount && <a href={pageUrl(page + 1)}>{t("blogListing.nextPage")}</a>}
          </nav>
        )}
      </section>
    );
  },
);
