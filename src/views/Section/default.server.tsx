import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import type { ContainerProps } from "../../theme/index.jsx";
import classes from "./component.module.css";

type Columns = "100" | "50-50" | "67-33" | "33-67" | "33-33-33" | "25-25-25-25" | "irregular-3-2";
type Width = "100" | "75" | "50";
type Gap = "1" | "2";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:section",
  },
  ({
    "jcr:title": title,
    subtitle,
    columns,
    width,
    gap,
    theme,
    background,
  }: {
    "jcr:title"?: string;
    "subtitle"?: string;
    "columns": Columns;
    "width": Width;
    "gap": Gap;
  } & ContainerProps) => (
    <section className={classes.container} data-theme={theme} data-bg={background}>
      {(title || subtitle) && (
        <header className={classes.header}>
          {title && <h2>{title}</h2>}
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
        </header>
      )}
      <div className={classes.grid} data-columns={columns} data-width={width} data-gap={gap}>
        <RenderChildren />
      </div>
    </section>
  ),
);
