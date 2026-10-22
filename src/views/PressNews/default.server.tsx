import { Island, jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import Filters from "./Filters.client.jsx";
import classes from "./component.module.css";
import sectionClasses from "../Section/component.module.css";
import type { Props } from "./types.js";

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
    }: Props,
    { currentNode, renderContext },
  ) => {
    const { t } = useTranslation();
    const id = `press-${currentNode.getIdentifier()}`;
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
              isEditMode: renderContext.isEditMode(),
              pageSize,
              layout,
            }}
          >
            <RenderChildren filter="jahiacom:pressItem" />
          </Island>
        </div>
      </section>
    );
  },
);
