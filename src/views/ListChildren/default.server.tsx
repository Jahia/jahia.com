import { Island, jahiaComponent, Render, useJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import Filter from "./Filter.client.jsx";

interface Props {
  parent?: JCRNodeWrapper;
  nodeType?: string;
  categoryFilters?: Array<JCRNodeWrapper | null>;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:listChildren",
  },
  ({ parent, nodeType = "jnt:page", categoryFilters }: Props, { renderContext }) => {
    if (!parent) return null;

    // Retrieve all direct and indirect children objects of `parent`
    const children = useJCRQuery({
      query: `
        SELECT * FROM [${nodeType}]
        WHERE ISDESCENDANTNODE(${JSON.stringify(parent.getPath())})
      `,
    });

    // Retrieve all categories of all children
    const allUsedCategories = new Set<string>();
    const childrenWithCategories: Array<{ child: JCRNodeWrapper; categories: string[] }> = [];
    for (const child of children) {
      if (!child.hasProperty("j:defaultCategory")) {
        childrenWithCategories.push({ child, categories: [] });
        continue;
      }
      const categories = [];
      for (const category of child.getProperty("j:defaultCategory").getValues()) {
        const name = category.getNode().getName();
        allUsedCategories.add(name);
        categories.push(name);
      }
      childrenWithCategories.push({ child, categories });
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

    const params = renderContext.getRequest().getParameterMap();

    return (
      <Island component={Filter}>
        {filters.size > 0 && (
          <div>
            Filter:
            {[...filters].map(([categoryPicker, categoryList]) => {
              const name = categoryPicker.getName();
              return (
                <select
                  key={categoryPicker.getIdentifier()}
                  name={name}
                  value={params.containsKey(name) ? params.get(name)[0] : ""}
                >
                  <option value="">{categoryPicker.getDisplayableName()}</option>
                  {categoryList.map((category) => (
                    <option key={category.getIdentifier()} value={category.getName()}>
                      {category.getDisplayableName()}
                    </option>
                  ))}
                </select>
              );
            })}
          </div>
        )}

        {childrenWithCategories.map(({ child, categories }) => {
          const mappedCategories = new Map<string, string>(
            categories
              .filter((category) => reverseCategoryMap.has(category))
              .map((category) => [reverseCategoryMap.get(category)!, category]),
          );
          return (
            <div
              key={child.getIdentifier()}
              data-categories={[...mappedCategories]
                .map(([parent, category]) => `${parent}=${category}`)
                .join("&")}
              hidden={
                ![...filters].every(([category]) => {
                  const name = category.getName();
                  return (
                    !params.containsKey(name) || params.get(name)![0] === mappedCategories.get(name)
                  );
                })
              }
            >
              <Render node={child} />
            </div>
          );
        })}
      </Island>
    );
  },
);
