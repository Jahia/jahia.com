import { Island, jahiaComponent, Render, useJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import Filter from "./Filter.client.jsx";
import classes from "./styles.module.css";

interface Props {
  parent?: JCRNodeWrapper;
  nodeType?: string;
  filterMode?: string;
  filterCount?: string;
  filter1Title?: string;
  filter1Category?: JCRNodeWrapper;
  filter1Categories?: Array<JCRNodeWrapper | null>;
  filter2Title?: string;
  filter2Category?: JCRNodeWrapper;
  filter2Categories?: Array<JCRNodeWrapper | null>;
  filter3Title?: string;
  filter3Category?: JCRNodeWrapper;
  filter3Categories?: Array<JCRNodeWrapper | null>;
  filter4Title?: string;
  filter4Category?: JCRNodeWrapper;
  filter4Categories?: Array<JCRNodeWrapper | null>;
  filter5Title?: string;
  filter5Category?: JCRNodeWrapper;
  filter5Categories?: Array<JCRNodeWrapper | null>;
  emptyState?: string;
}

interface FilterConfig {
  name: string;
  title: string;
  options: Array<{ node: JCRNodeWrapper; parentId: string }>;
}

const isInCategoryBranch = (category: JCRNodeWrapper, root: JCRNodeWrapper) =>
  category.getPath() === root.getPath() || category.getPath().startsWith(`${root.getPath()}/`);

const referencedNodes = (node: JCRNodeWrapper, propertyName: string) => {
  if (!node.hasProperty(propertyName)) return [];
  const property = node.getProperty(propertyName);
  const values = property.isMultiple() ? property.getValues() : [property.getValue()];
  return values
    .map((value) => value.getNode() as JCRNodeWrapper | null)
    .filter((value): value is JCRNodeWrapper => value !== null);
};

const pageAncestor = (node: JCRNodeWrapper): JCRNodeWrapper | undefined => {
  let current: JCRNodeWrapper | undefined = node;
  while (!current.isNodeType("jnt:page")) {
    if (current.getPath() === "/") return undefined;
    current = current.getParent() as JCRNodeWrapper;
  }
  return current;
};

const translatedString = (node: JCRNodeWrapper, name: string, current?: string) => {
  if (current) return current;
  for (const language of ["fr", "en"]) {
    const translationName = `j:translation_${language}`;
    if (!node.hasNode(translationName)) continue;
    const translation = node.getNode(translationName) as JCRNodeWrapper;
    if (translation.hasProperty(name)) return translation.getPropertyAsString(name);
  }
  return "";
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:advancedListChildren",
    properties: { "cache.requestParameters": "*" },
  },
  (props: Props, { currentNode, renderContext }) => {
    const { t } = useTranslation();
    const source = props.parent ?? pageAncestor(currentNode);
    if (!source) return null;

    const roots = (props.filter1Categories || []).filter(
      (node): node is JCRNodeWrapper => node !== null,
    );
    const descendants = roots.flatMap((root) =>
      useJCRQuery({
        query: `SELECT * FROM [jnt:category]
                WHERE ISDESCENDANTNODE(${JSON.stringify(root.getPath())})`,
      }),
    );
    const descendantNodes = [
      ...new Map(descendants.map((node) => [node.getIdentifier(), node])).values(),
    ];
    const rootTitle = translatedString(currentNode, "filter1Title", props.filter1Title);
    const hierarchy = (props.filterMode || "hierarchy") !== "independent";
    const filters = (
      hierarchy
        ? Array.from({ length: 2 }, (_, index) => {
            const rootIds = new Set(roots.map((root) => root.getIdentifier()));
            const nodes =
              index === 0
                ? descendantNodes.filter(
                    (node) =>
                      node.getParent().isNodeType("jnt:category") &&
                      rootIds.has(node.getParent().getIdentifier()),
                  )
                : descendantNodes;
            const options = nodes.map((node) => ({
              node,
              parentId:
                index === 0 || !node.getParent().isNodeType("jnt:category")
                  ? ""
                  : node.getParent().getIdentifier(),
            }));
            return rootTitle && options.length > 0
              ? { name: `filter${index + 1}`, title: rootTitle, options }
              : null;
          })
        : roots.slice(0, 2).map((root, index) => {
            const options = descendantNodes
              .filter((node) => isInCategoryBranch(node, root))
              .map((node) => ({ node, parentId: "" }));
            return options.length > 0
              ? {
                  name: `filter${index + 1}`,
                  title: root.getDisplayableName(),
                  options,
                }
              : null;
          })
    ).filter((filter): filter is FilterConfig => filter !== null);

    const children = useJCRQuery({
      query: `
        SELECT * FROM [${props.nodeType || "jnt:page"}]
        WHERE ISDESCENDANTNODE(${JSON.stringify(source.getPath())})
        ORDER BY [jcr:created] DESC
      `,
    });

    const childrenAndCategories = children.map((child) => {
      server.render.addCacheDependency({ path: child.getPath() }, renderContext);
      return { child };
    });

    const categoryFilters = filters.map((filter) => {
      const options = filter.options.sort((left, right) =>
        left.node.getDisplayableName().localeCompare(right.node.getDisplayableName()),
      );
      for (const option of options)
        server.render.addCacheDependency({ path: option.node.getPath() }, renderContext);
      return { ...filter, options };
    });

    const requestParams = renderContext.getRequest().getParameterMap();
    const selected = new Map<string, string>();
    categoryFilters.forEach(({ name, options }, index) => {
      const requested = requestParams.containsKey(name) ? requestParams.get(name)[0] : null;
      const parent = hierarchy && index > 0 ? selected.get(`filter${index}`) || "" : "";
      selected.set(
        name,
        requested &&
          options.some(
            (option) =>
              option.node.getIdentifier() === requested &&
              (!hierarchy || option.parentId === parent),
          )
          ? requested
          : "",
      );
    });

    return (
      <Island component={Filter}>
        <div className={classes.filterPanel}>
          <div className={classes.filterFields} data-count={categoryFilters.length}>
            {categoryFilters.map(({ name, title, options }, index) => (
              <label
                key={name}
                data-hierarchy-level={hierarchy ? index : undefined}
                hidden={hierarchy && index > 0}
              >
                <span data-category-title={hierarchy && index > 0 ? "" : undefined}>{title}</span>
                <select data-filter="" name={name} defaultValue={selected.get(name)}>
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
          <div className={classes.actions}>
            <button type="reset">{t("advancedListChildren.reset")}</button>
          </div>
        </div>

        <div className={classes.grid}>
          {childrenAndCategories.map(({ child }) => {
            const assignedCategories = referencedNodes(child, "j:defaultCategory");
            const values = categoryFilters.flatMap(({ name, options }) =>
              options
                .filter(({ node }) =>
                  assignedCategories.some((category) => isInCategoryBranch(category, node)),
                )
                .map(({ node }) => `${name}=${node.getIdentifier()}`),
            );
            const hidden = categoryFilters.some(
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
          {props.emptyState && (
            <div className="_richtext" dangerouslySetInnerHTML={{ __html: props.emptyState }} />
          )}
        </div>
      </Island>
    );
  },
);
