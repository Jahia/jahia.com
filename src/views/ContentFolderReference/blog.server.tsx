import {
  Island,
  buildNodeUrl,
  jahiaComponent,
  Render,
  server,
  useJCRQuery,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import CascadingSelects from "../../components/CascadingSelects.client.jsx";
import BlogGrid from "./BlogGrid.client.jsx";
import classes from "./styles.module.css";
import { contentCategories } from "../../utils/contentCategories.js";

import {
  blogPage,
  blogPageSize as sanitizePageSize,
  blogPageUrl,
  paginateBlog,
} from "./blogPagination.js";
import { eligibleBlogEntries, timestamp } from "./blogEntries.server.js";

interface Props {
  "j:node"?: JCRNodeWrapper;
  "blogPageSize"?: string;
  "featuredArticle"?: JCRNodeWrapper;
  "featuredIncludeUpdatedArticles"?: boolean;
  "blogAdvancedFilter"?: JCRNodeWrapper;
}

const referencedNodes = (entry: JCRNodeWrapper, propertyName: string) => {
  if (!entry.hasProperty(propertyName)) return [];
  const property = entry.getProperty(propertyName);
  const values = property.isMultiple() ? property.getValues() : [property.getValue()];
  return values
    .map((value) => value.getNode() as JCRNodeWrapper | null)
    .filter((node): node is JCRNodeWrapper => node !== null);
};

const categoryPaths = (entry: JCRNodeWrapper) =>
  contentCategories(entry).map((category) => category.getPath());

const pathIsInBranch = (path: string, branchPath: string) =>
  path === branchPath || path.startsWith(`${branchPath}/`);

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

const effectiveFeaturedTimestamp = (entry: JCRNodeWrapper) =>
  entry.hasProperty("useLastModifiedDate") && entry.getProperty("useLastModifiedDate").getBoolean()
    ? timestamp(entry, "jcr:lastModified") || timestamp(entry, "date")
    : timestamp(entry, "date");

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jnt:contentFolderReference",
    name: "blog",
    properties: {
      "cache.requestParameters": "blogPage,filter1,filter2",
      "cache.mainResource": "true",
    },
  },
  (
    {
      "j:node": folder,
      blogPageSize,
      featuredArticle,
      featuredIncludeUpdatedArticles,
      blogAdvancedFilter,
    }: Props,
    { renderContext, currentNode },
  ) => {
    const { t } = useTranslation();
    if (folder)
      server.render.addCacheDependency(
        { flushOnPathMatchingRegexp: `${folder.getPath()}/.*` },
        renderContext,
      );
    if (!folder) return null;

    const entries = eligibleBlogEntries(folder);
    if (renderContext.isEditMode())
      return (
        <div>
          {entries.map((entry) => (
            <Render key={entry.getIdentifier()} node={entry} />
          ))}
        </div>
      );
    if (entries.length === 0) return null;

    const entriesById = new Map(entries.map((entry) => [entry.getIdentifier(), entry]));
    const configuredFeaturedEntry = featuredArticle
      ? entriesById.get(featuredArticle.getIdentifier())
      : undefined;
    const automaticFeatured = featuredIncludeUpdatedArticles
      ? [...entries].sort(
          (first, second) => effectiveFeaturedTimestamp(second) - effectiveFeaturedTimestamp(first),
        )
      : entries;
    const featuredEntry = configuredFeaturedEntry || automaticFeatured[0];
    const regularEntries = entries.filter(
      (entry) => entry.getIdentifier() !== featuredEntry.getIdentifier(),
    );
    const categoryPathsByEntry = new Map(
      regularEntries.map((entry) => [entry.getIdentifier(), categoryPaths(entry)]),
    );
    const categoryOptions = [
      ...new Map(
        regularEntries.flatMap((entry) =>
          contentCategories(entry)
            .filter(
              (category) =>
                !/\/categories\/(pageTypes|resourcestypes|blogTypes)(\/|$)/.test(
                  category.getPath(),
                ),
            )
            .map((node) => [node.getIdentifier(), node]),
        ),
      ).values(),
    ]
      .map((node) => ({
        id: node.getIdentifier(),
        label: node.getDisplayableName(),
        node,
        path: node.getPath(),
        parentId: "",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
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
    const advancedHierarchy = blogAdvancedFilter
      ? nodeString(blogAdvancedFilter, "filterMode") !== "independent"
      : false;
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
      : categoryOptions.length
        ? [{ name: "filter1", title: t("blogListing.categories"), options: categoryOptions }]
        : [];
    const request = renderContext.getRequest();
    const selectedFilters: Record<string, string> = {};
    for (const filter of advancedFilters) {
      const value = request.getParameter(filter.name) || "";
      const option = filter.options.find((option) => option.id === value);
      if (
        option &&
        (!advancedHierarchy ||
          filter.name === "filter1" ||
          option.parentId === selectedFilters.filter1)
      )
        selectedFilters[filter.name] = value;
    }
    const filterValues = new Map(
      regularEntries.map((entry) => {
        const assignedPaths = categoryPathsByEntry.get(entry.getIdentifier()) || [];
        return [
          entry.getIdentifier(),
          advancedFilters.flatMap(({ name, options }) =>
            options
              .filter(({ path }) =>
                assignedPaths.some((assigned) => pathIsInBranch(assigned, path)),
              )
              .map(({ id }) => name + "=" + id),
          ),
        ];
      }),
    );
    const filteredEntries = regularEntries.filter((entry) =>
      Object.entries(selectedFilters).every(([name, value]) =>
        filterValues.get(entry.getIdentifier())!.includes(name + "=" + value),
      ),
    );
    const pageSize = sanitizePageSize(blogPageSize);
    const pagination = paginateBlog(
      filteredEntries,
      pageSize,
      blogPage(request.getParameter("blogPage")),
    );
    const baseUrl = buildNodeUrl(renderContext.getMainResource().getNode());
    const pageUrls = Array.from({ length: pagination.count }, (_, index) =>
      blogPageUrl(baseUrl, index + 1, selectedFilters),
    );
    const filterDependencies = new Map(
      [
        ...(blogAdvancedFilter ? [blogAdvancedFilter] : []),
        ...advancedFilters.flatMap(({ options }) => options.map(({ node }) => node)),
      ].map((node) => [node.getIdentifier(), node]),
    );
    for (const node of filterDependencies.values())
      server.render.addCacheDependency({ path: node.getPath() }, renderContext);

    const articlesId = `blog-articles-${currentNode.getIdentifier()}`;
    return (
      <section
        className={classes.blogListing}
        data-blog-pagination=""
        data-blog-page={pagination.page}
        data-blog-pages={pagination.count}
      >
        <section
          className={classes.featuredArticles}
          aria-label={t("blogListing.featuredArticles")}
        >
          <h2 className={classes.featuredHeading}>{t("blogListing.featured")}</h2>
          <Render node={featuredEntry} view="featuredLead" />
        </section>
        <h2 id={articlesId} tabIndex={-1} className={classes.articlesHeading}>
          {t("blogListing.allArticles")}
        </h2>
        {advancedFilters.length > 0 && (
          <Island component={CascadingSelects} props={{ navigateOnChange: true }}>
            <form className={classes.filterForm} method="get" action={baseUrl + "#" + articlesId}>
              <div hidden>
                {regularEntries.map((entry) => (
                  <span
                    key={entry.getIdentifier()}
                    data-filter-values={filterValues.get(entry.getIdentifier())!.join("|")}
                  />
                ))}
              </div>
              {advancedFilters.map(({ name, title, options }, index) => (
                <label
                  key={name}
                  data-hierarchy-level={advancedHierarchy ? index : undefined}
                  hidden={advancedHierarchy && index > 0}
                >
                  <span data-category-title={advancedHierarchy && index > 0 ? "" : undefined}>
                    {title}
                  </span>
                  <select name={name} defaultValue={selectedFilters[name] || ""}>
                    <option value="">
                      {!advancedHierarchy || index === 0
                        ? t(
                            blogAdvancedFilter
                              ? "advancedListChildren.selectOption"
                              : "blogListing.allCategories",
                          )
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
                <button type="submit">{t("blogListing.applyFilters")}</button>
                <a href={baseUrl + "#" + articlesId}>{t("blogListing.resetFilters")}</a>
              </div>
            </form>
          </Island>
        )}
        {filteredEntries.length > 0 ? (
          <Island
            component={BlogGrid}
            props={{
              page: pagination.page,
              pageUrls: pageUrls.map((url) => url + "#" + articlesId),
              gridClassName: classes.grid,
              paginationClassName: classes.pagination,
              paginationLabel: t("blogListing.pagination"),
              selectLabel: t("blogListing.selectPage"),
              previousLabel: t("blogListing.previousPage"),
              nextLabel: t("blogListing.nextPage"),
            }}
          >
            {pagination.items.map((entry) => {
              const assignedPaths = categoryPathsByEntry.get(entry.getIdentifier()) || [];
              const values = advancedFilters.flatMap(({ name, options }) =>
                options
                  .filter(({ path }) =>
                    assignedPaths.some((assignedPath) => pathIsInBranch(assignedPath, path)),
                  )
                  .map(({ id }) => `${name}=${id}`),
              );
              return (
                <div
                  key={entry.getIdentifier()}
                  className={classes.cardSlot}
                  data-blog-card-slot=""
                  data-filter-values={values.join("|")}
                  data-filter-match="true"
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
