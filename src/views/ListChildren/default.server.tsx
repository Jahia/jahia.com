import { Island, jahiaComponent, Render, useJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import Filter from "./Filter.client.jsx";
import classes from "./styles.module.css";

interface Props {
  parent?: JCRNodeWrapper;
  nodeType?: string;
  categoryFilters?: Array<JCRNodeWrapper | null>;
  emptyState?: string;
  clearButtonLabel?: string;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:listChildren",
  },
  (
    { parent, nodeType = "jnt:page", categoryFilters, emptyState, clearButtonLabel }: Props,
    { renderContext },
  ) => {
    if (!parent) return null;

    // Retrieve all direct and indirect children objects of `parent`
    const children = useJCRQuery({
      query: `
        SELECT * FROM [${nodeType}]
        WHERE ISDESCENDANTNODE(${JSON.stringify(parent.getPath())})
        ORDER BY [jcr:created] DESC
      `,
    });

    // Retrieve all categories of all children
    const allUsedCategories = new Set<string>();
    const childrenAndCategories: Array<{ child: JCRNodeWrapper; categories: Set<string> }> = [];
    for (const child of children) {
      if (!child.hasProperty("j:defaultCategory")) {
        childrenAndCategories.push({ child, categories: new Set() });
        continue;
      }
      const categories = new Set<string>();
      for (const category of child.getProperty("j:defaultCategory").getValues()) {
        const name = category.getNode().getName();
        allUsedCategories.add(name);
        categories.add(name);
      }
      childrenAndCategories.push({ child, categories });
    }

    // Intersect categories from `categoryFilters` and the ones actually used by the children
    const filters = new Map<JCRNodeWrapper, JCRNodeWrapper[]>();
    const reverseCategoryMap = new Map<string, string>();
    for (const categoryFilter of categoryFilters ?? []) {
      if (!categoryFilter) continue;
      const categoryList = [];
      // Keep only the categories that are used by at least one child
      for (const category of useJCRQuery({
        query: `
          SELECT * FROM [jnt:category]
          WHERE ISDESCENDANTNODE(${JSON.stringify(categoryFilter.getPath())})
        `,
      })) {
        const name = category.getName();
        if (allUsedCategories.has(name)) {
          reverseCategoryMap.set(name, categoryFilter.getName());
          categoryList.push(category);
        }
      }
      if (categoryList.length > 0) {
        filters.set(categoryFilter, categoryList);
      }
    }

    // If the query parameters contain filters, extract them and apply them on the server
    const requestParams = renderContext.getRequest().getParameterMap();
    const params = new Map(
      [...filters]
        .map<
          [string, string | null]
        >(([filter]) => [filter.getName(), requestParams.containsKey(filter.getName()) ? requestParams.get(filter.getName())[0] : null])
        .filter((param): param is [string, string] => param[1] !== null && param[1] !== ""),
    );

    return (
      <Island component={Filter}>
        {filters.size > 0 && (
          <div className="_center-4" style={{ flexWrap: "wrap" }}>
            {[...filters].map(([categoryPicker, categoryList]) => {
              const name = categoryPicker.getName();
              return (
                <select key={categoryPicker.getIdentifier()} name={name} value={params.get(name)}>
                  <option value="">{categoryPicker.getDisplayableName()}</option>
                  {categoryList.map((category) => (
                    <option key={category.getIdentifier()} value={category.getName()}>
                      {category.getDisplayableName()}
                    </option>
                  ))}
                </select>
              );
            })}
            <noscript>
              <input type="submit" style={{ marginTop: 0 }} />
            </noscript>
          </div>
        )}

        <div className={classes.grid}>
          {childrenAndCategories.map(({ child, categories }) => (
            <div
              key={child.getIdentifier()}
              data-categories={[...categories]
                .filter((category) => reverseCategoryMap.has(category))
                .map((category) => `${reverseCategoryMap.get(category)}=${category}`)
                .join("&")}
              hidden={
                ![...filters].every(
                  ([category]) =>
                    !params.has(category.getName()) ||
                    categories.has(params.get(category.getName())!),
                )
              }
            >
              <Render node={child} />
            </div>
          ))}
        </div>

        <div className={classes.emptyState}>
          {emptyState && (
            <div className="_richtext" dangerouslySetInnerHTML={{ __html: emptyState }} />
          )}
          <p>
            <button type="reset">{clearButtonLabel}</button>
          </p>
        </div>
      </Island>
    );
  },
);
