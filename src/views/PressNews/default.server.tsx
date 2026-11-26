import {
  Island,
  jahiaComponent,
  Render,
  RenderChildren,
  server,
} from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import Filters from "./Filters.client.jsx";
import classes from "./component.module.css";
import sectionClasses from "../Section/component.module.css";
import type { Props } from "./types.js";
import { pressItems, pressItemsByDate } from "./items.server.js";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:pressNews" },
  (
    {
      "jcr:title": title,
      subtitle,
      pageSize = 6,
      layout = "cards",
      theme = "cloudy",
      background,
      hiddenFilters,
      filterTypes,
    }: Props,
    { currentNode, renderContext },
  ) => {
    const { t } = useTranslation();
    const id = `press-${currentNode.getIdentifier()}`;
    const isEditMode = renderContext.isEditMode();
    const items = isEditMode ? [] : pressItemsByDate(pressItems(currentNode));
    for (const item of items)
      server.render.addCacheDependency({ path: item.getPath() }, renderContext);
    return (
      <section
        id={currentNode.getName()}
        className={`${classes.room} ${sectionClasses.container}`}
        data-theme={theme}
        data-bg={background}
      >
        <header className={sectionClasses.header}>
          <h2>{title || t("pressRoom.news")}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>
        <div>
          <Island
            component={Filters}
            props={{
              id,
              isEditMode,
              pageSize,
              layout,
              hiddenFilters,
              filterTypes,
            }}
          >
            {isEditMode ? (
              <RenderChildren filter="jahiacom:pressItem" />
            ) : (
              items.map((item) => <Render key={item.getIdentifier()} node={item} />)
            )}
          </Island>
        </div>
      </section>
    );
  },
);
