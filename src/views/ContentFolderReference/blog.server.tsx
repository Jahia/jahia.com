import {
  Island,
  jahiaComponent,
  Render,
  server,
  useJCRQuery,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import CascadingSelects from "../../components/CascadingSelects.client.jsx";
import BlogGrid from "./BlogGrid.client.jsx";
import FeaturedBlogCarousel from "./FeaturedBlogCarousel.client.jsx";
import classes from "./styles.module.css";

interface Props {
  "j:node"?: JCRNodeWrapper;
  "blogPageSize"?: string;
  "featuredArticle"?: JCRNodeWrapper;
  "featuredArticles"?: Array<JCRNodeWrapper | null>;
  "featuredIncludeUpdatedArticles"?: boolean;
  "blogAdvancedFilter"?: JCRNodeWrapper;
}

const pageSizes = new Set([6, 12, 18, 24]);

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

const categoryPaths = (entry: JCRNodeWrapper) =>
  referencedNodes(entry, "j:defaultCategory").map((category) => category.getPath());

const pathIsInBranch = (path: string, branchPath: string) =>
  path === branchPath || path.startsWith(`${branchPath}/`);

const configuredNodes = (nodes?: Array<JCRNodeWrapper | null>) =>
  (nodes || []).filter((node): node is JCRNodeWrapper => node !== null);

const nodeString = (node: JCRNodeWrapper, name: string) => {
  if (node.hasProperty(name) && node.getPropertyAsString(name))
    return node.getPropertyAsString(name);
  for (const language of ["fr", "en"]) {
    const translationName = `j:translation_${language}`;
    if (!node.hasNode(translationName)) continue;
    const translation = node.getNode(translationName) as JCRNodeWrapper;
    if (translation.hasProperty(name) && translation.getPropertyAsString(name))
      return translation.getPropertyAsString(name);
  }
  return "";
};

const nodeReferences = (node: JCRNodeWrapper, name: string) =>
  node.hasProperty(name) ? referencedNodes(node, name) : [];

const timestamp = (entry: JCRNodeWrapper, propertyName: string) => {
  if (!entry.hasProperty(propertyName)) return 0;
  try {
    const dateValue = entry.getProperty(propertyName).getValue() as unknown as {
      getDate: () => { getTimeInMillis: () => number };
    };
    const value = Number(dateValue.getDate().getTimeInMillis());
    if (Number.isFinite(value)) return value;
  } catch {
    // Fall through to support legacy string properties.
  }

  const fallback = Date.parse(entry.getPropertyAsString(propertyName));
  return Number.isFinite(fallback) ? fallback : 0;
};

const isPublished = (entry: JCRNodeWrapper) =>
  entry.hasProperty("j:published") && entry.getProperty("j:published").getBoolean();

const isCurrentlyVisible = (entry: JCRNodeWrapper) => {
  const publicationDate = timestamp(entry, "date");
  return (
    isPublished(entry) &&
    (!publicationDate || publicationDate <= Date.now()) &&
    entry.hasProperty("jcr:title") &&
    Boolean(entry.getPropertyAsString("jcr:title").trim())
  );
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
    properties: { "cache.requestParameters": "filter1,filter2,blogPage" },
  },
  (
    {
      "j:node": folder,
      blogPageSize,
      featuredArticle,
      featuredArticles,
      featuredIncludeUpdatedArticles,
      blogAdvancedFilter,
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

    const cutoff = new Date().toISOString();
    const queriedEntries = useJCRQuery({
      query: `SELECT * FROM [jahiacom:blogEntry]
              WHERE ISDESCENDANTNODE(${JSON.stringify(folder.getPath())})
                AND [j:published] = true
                AND [date] <= CAST(${JSON.stringify(cutoff)} AS DATE)
              ORDER BY [date] DESC`,
    });
    const entries = queriedEntries.filter(isCurrentlyVisible);
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
    const categoryPathsByEntry = new Map(
      regularEntries.map((entry) => [entry.getIdentifier(), categoryPaths(entry)]),
    );
    const request = renderContext.getRequest();
    const advancedRoots = blogAdvancedFilter
      ? nodeReferences(blogAdvancedFilter, "filter1Categories")
      : [];
    const advancedDescendants = advancedRoots.flatMap((root) =>
      useJCRQuery({
        query: `SELECT * FROM [jnt:category]
                WHERE ISDESCENDANTNODE(${JSON.stringify(root.getPath())})`,
      }),
    );
    const uniqueAdvancedDescendants = [
      ...new Map(advancedDescendants.map((node) => [node.getIdentifier(), node])).values(),
    ];
    const advancedHierarchy =
      !blogAdvancedFilter || nodeString(blogAdvancedFilter, "filterMode") !== "independent";
    const advancedFilters = blogAdvancedFilter
      ? (advancedHierarchy
          ? Array.from({ length: 2 }, (_, index) => {
              const rootIds = new Set(advancedRoots.map((root) => root.getIdentifier()));
              const categories =
                index === 0
                  ? uniqueAdvancedDescendants.filter(
                      (node) =>
                        node.getParent().isNodeType("jnt:category") &&
                        rootIds.has(node.getParent().getIdentifier()),
                    )
                  : uniqueAdvancedDescendants;
              const title = nodeString(blogAdvancedFilter, "filter1Title");
              if (categories.length === 0 || !title) return null;
              const options = categories
                .map((node) => ({
                  id: node.getIdentifier(),
                  label: node.getDisplayableName(),
                  node,
                  path: node.getPath(),
                  parentId:
                    index === 0 || !node.getParent().isNodeType("jnt:category")
                      ? ""
                      : node.getParent().getIdentifier(),
                }))
                .sort((a, b) => a.label.localeCompare(b.label));
              return { name: `filter${index + 1}`, title, options };
            })
          : advancedRoots.slice(0, 2).map((root, index) => {
              const options = uniqueAdvancedDescendants
                .filter((node) => node.getPath().startsWith(`${root.getPath()}/`))
                .map((node) => ({
                  id: node.getIdentifier(),
                  label: node.getDisplayableName(),
                  node,
                  path: node.getPath(),
                  parentId: "",
                }))
                .sort((a, b) => a.label.localeCompare(b.label));
              return options.length > 0
                ? {
                    name: `filter${index + 1}`,
                    title: root.getDisplayableName(),
                    options,
                  }
                : null;
            })
        ).filter((filter): filter is NonNullable<typeof filter> => filter !== null)
      : [];
    const selectedAdvanced = new Map<string, string>();
    advancedFilters.forEach(({ name, options }, index) => {
      const requested = request.getParameter(name);
      const parent =
        advancedHierarchy && index > 0 ? selectedAdvanced.get(`filter${index}`) || "" : "";
      selectedAdvanced.set(
        name,
        requested &&
          options.some(
            ({ id, parentId }) => id === requested && (!advancedHierarchy || parentId === parent),
          )
          ? requested
          : "",
      );
    });
    const filteredEntries = regularEntries;
    const pageSize = sanitizePageSize(blogPageSize);
    const requestedPage = Number.parseInt(request.getParameter("blogPage") || "1", 10);
    const filterDependencies = new Map(
      [
        ...(blogAdvancedFilter ? [blogAdvancedFilter] : []),
        ...advancedFilters.flatMap(({ options }) => options.map(({ node }) => node)),
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
        {advancedFilters.length > 0 && (
          <Island component={CascadingSelects} props={{ applyFiltersOnChange: true }}>
            <form className={classes.filterForm} method="get">
              {advancedFilters.map(({ name, title, options }, index) => (
                <label
                  key={name}
                  data-hierarchy-level={advancedHierarchy ? index : undefined}
                  hidden={advancedHierarchy && index > 0}
                >
                  <span data-category-title={advancedHierarchy && index > 0 ? "" : undefined}>
                    {title}
                  </span>
                  <select name={name} defaultValue={selectedAdvanced.get(name)}>
                    <option value="">
                      {!advancedHierarchy || index === 0
                        ? t("advancedListChildren.selectOption")
                        : title}
                    </option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id} data-parent-id={option.parentId}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <div className={classes.filterActions}>
                <button type="reset">{t("blogListing.resetFilters")}</button>
              </div>
            </form>
          </Island>
        )}
        {filteredEntries.length > 0 ? (
          <Island
            component={BlogGrid}
            props={{
              pageSize,
              initialPage: Number.isFinite(requestedPage) ? requestedPage : 1,
              gridClassName: classes.grid,
              paginationClassName: classes.pagination,
              paginationLabel: t("blogListing.pagination"),
              selectLabel: t("blogListing.selectPage"),
              previousLabel: t("blogListing.previousPage"),
              nextLabel: t("blogListing.nextPage"),
            }}
          >
            {filteredEntries.map((entry) => {
              const assignedPaths = categoryPathsByEntry.get(entry.getIdentifier()) || [];
              const values = advancedFilters.flatMap(({ name, options }) =>
                options
                  .filter(({ path }) =>
                    assignedPaths.some((assignedPath) => pathIsInBranch(assignedPath, path)),
                  )
                  .map(({ id }) => `${name}=${id}`),
              );
              const matches = advancedFilters.every(({ name }) => {
                const value = selectedAdvanced.get(name);
                return !value || values.includes(`${name}=${value}`);
              });
              return (
                <div
                  key={entry.getIdentifier()}
                  className={classes.cardSlot}
                  data-blog-card-slot=""
                  data-filter-values={values.join("|")}
                  data-filter-match={matches}
                >
                  <Render node={entry} />
                </div>
              );
            })}
          </Island>
        ) : (
          <p className={classes.empty}>{t("blogListing.noResults")}</p>
        )}
      </section>
    );
  },
);
