import {
  Island,
  jahiaComponent,
  Render,
  server,
  useJCRQuery,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import Filter from "./Filter.client.jsx";
import classes from "./styles.module.css";

interface Props {
  parent?: JCRNodeWrapper;
  nodeType?: string;
  categoryFilters?: Array<JCRNodeWrapper | null>;
  emptyState?: string;
  clearButtonLabel?: string;
}

interface FilterConfig {
  name: string;
  title: string;
  options: Array<{ node: JCRNodeWrapper; parentId: string }>;
}

const pageAncestor = (node: JCRNodeWrapper): JCRNodeWrapper | undefined => {
  let current: JCRNodeWrapper | undefined = node;
  while (!current.isNodeType("jnt:page")) {
    if (current.getPath() === "/") return undefined;
    current = current.getParent() as JCRNodeWrapper;
  }
  return current;
};

const referencedCategories = (node: JCRNodeWrapper) => {
  if (!node.hasProperty("j:defaultCategory")) return [];
  return node
    .getProperty("j:defaultCategory")
    .getValues()
    .map((value) => value.getNode() as JCRNodeWrapper | null)
    .filter((category): category is JCRNodeWrapper => category !== null);
};

const isInBranch = (category: JCRNodeWrapper, branch: JCRNodeWrapper) =>
  category.getPath() === branch.getPath() || category.getPath().startsWith(`${branch.getPath()}/`);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:listChildren",
    properties: { "cache.requestParameters": "filter1,filter2" },
  },
  (
    { parent, nodeType = "jnt:page", categoryFilters, emptyState, clearButtonLabel }: Props,
    { currentNode, renderContext },
  ) => {
    const { t } = useTranslation();
    const source = parent ?? pageAncestor(currentNode);
    if (!source) return null;

    const children = useJCRQuery({
      query: `SELECT * FROM [${nodeType}]
              WHERE ISDESCENDANTNODE(${JSON.stringify(source.getPath())})
              ORDER BY [jcr:created] DESC`,
    });
    const childrenAndCategories = children.map((child) => {
      server.render.addCacheDependency({ path: child.getPath() }, renderContext);
      return { child, categories: referencedCategories(child) };
    });

    const roots = (categoryFilters || [])
      .filter((root): root is JCRNodeWrapper => root !== null)
      .slice(0, 2);
    const descendants = roots.flatMap((root) =>
      useJCRQuery({
        query: `SELECT * FROM [jnt:category]
                WHERE ISDESCENDANTNODE(${JSON.stringify(root.getPath())})`,
      }),
    );
    const uniqueDescendants = [
      ...new Map(descendants.map((node) => [node.getIdentifier(), node])).values(),
    ];
    const optionIsUsed = (option: JCRNodeWrapper) =>
      childrenAndCategories.some(({ categories }) =>
        categories.some((category) => isInBranch(category, option)),
      );
    const hierarchy = roots.length === 1;
    const filters = (
      hierarchy
        ? Array.from({ length: 2 }, (_, index) => {
            const root = roots[0];
            if (!root) return null;
            const nodes =
              index === 0
                ? uniqueDescendants.filter(
                    (node) =>
                      node.getParent().isNodeType("jnt:category") &&
                      node.getParent().getIdentifier() === root.getIdentifier(),
                  )
                : uniqueDescendants;
            const options = nodes
              .filter(optionIsUsed)
              .map((node) => ({
                node,
                parentId:
                  index === 0 || !node.getParent().isNodeType("jnt:category")
                    ? ""
                    : node.getParent().getIdentifier(),
              }))
              .sort((a, b) =>
                a.node.getDisplayableName().localeCompare(b.node.getDisplayableName()),
              );
            return options.length > 0
              ? { name: `filter${index + 1}`, title: root.getDisplayableName(), options }
              : null;
          })
        : roots.map((root, index) => {
            const options = uniqueDescendants
              .filter((node) => isInBranch(node, root) && optionIsUsed(node))
              .map((node) => ({ node, parentId: "" }))
              .sort((a, b) =>
                a.node.getDisplayableName().localeCompare(b.node.getDisplayableName()),
              );
            return options.length > 0
              ? { name: `filter${index + 1}`, title: root.getDisplayableName(), options }
              : null;
          })
    ).filter((filter): filter is FilterConfig => filter !== null);

    for (const node of [...roots, ...uniqueDescendants])
      server.render.addCacheDependency({ path: node.getPath() }, renderContext);

    const request = renderContext.getRequest();
    const selected = new Map<string, string>();
    filters.forEach(({ name, options }, index) => {
      const requested = request.getParameter(name);
      const parent = hierarchy && index > 0 ? selected.get(`filter${index}`) || "" : "";
      selected.set(
        name,
        requested &&
          options.some(
            ({ node, parentId }) =>
              node.getIdentifier() === requested && (!hierarchy || parentId === parent),
          )
          ? requested
          : "",
      );
    });

    return (
      <Island component={Filter}>
        {filters.length > 0 && (
          <div className={classes.filterPanel}>
            <div className={classes.filterFields} data-count={filters.length}>
              {filters.map(({ name, title, options }, index) => (
                <label
                  key={name}
                  data-hierarchy-level={hierarchy ? index : undefined}
                  hidden={hierarchy && index > 0}
                >
                  <span data-category-title={hierarchy && index > 0 ? "" : undefined}>{title}</span>
                  <select name={name} defaultValue={selected.get(name)}>
                    <option value="">
                      {!hierarchy || index === 0 ? t("advancedListChildren.selectOption") : title}
                    </option>
                    {options.map(({ node, parentId }) => (
                      <option
                        key={node.getIdentifier()}
                        value={node.getIdentifier()}
                        data-parent-id={parentId}
                      >
                        {node.getDisplayableName()}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button type="reset">{clearButtonLabel || t("advancedListChildren.reset")}</button>
          </div>
        )}

        <div className={classes.grid}>
          {childrenAndCategories.map(({ child, categories }) => {
            const values = filters.flatMap(({ name, options }) =>
              options
                .filter(({ node }) => categories.some((category) => isInBranch(category, node)))
                .map(({ node }) => `${name}=${node.getIdentifier()}`),
            );
            const hidden = filters.some(
              ({ name }) =>
                Boolean(selected.get(name)) && !values.includes(`${name}=${selected.get(name)}`),
            );
            return (
              <div
                key={child.getIdentifier()}
                data-filter-values={values.join("|")}
                hidden={hidden}
              >
                <Render node={child} />
              </div>
            );
          })}
        </div>

        <div className={classes.emptyState}>
          {emptyState && (
            <div className="_richtext" dangerouslySetInnerHTML={{ __html: emptyState }} />
          )}
        </div>
      </Island>
    );
  },
);
