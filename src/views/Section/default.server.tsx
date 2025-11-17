import { getChildNodes, jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import EditorHints from "../../components/EditorHints.jsx";
import { MixinCTA, type CTAProps } from "../../mixins/CTA/server.jsx";
import type { ContainerProps } from "../../theme/index.jsx";
import classes from "./component.module.css";

type Columns =
  | "100"
  | "50-50"
  | "irregular-100-50-50"
  | "irregular-50-50-100"
  | "67-33"
  | "33-67"
  | "irregular-67-33"
  | "irregular-100-33-33-33"
  | "irregular-33-33-33-100"
  | "33-33-33"
  | "25-25-25-25"
  | "irregular-3-2"; // It should be 2-3 because it starts with 2...
type Width = "100" | "75" | "50";
type Gap = "0" | "1" | "2";
type Cut = "before" | "after" | "both";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:section",
  },
  (
    {
      "jcr:title": title,
      subtitle,
      columns,
      width,
      gap,
      cut,
      theme,
      background,
      ...cta
    }: {
      "jcr:title"?: string;
      "subtitle"?: string;
      "columns": Columns;
      "width": Width;
      "gap": Gap;
      "cut": Cut;
    } & ContainerProps &
      CTAProps,
    { currentNode },
  ) => (
    <section className={classes.container} data-theme={theme} data-bg={background}>
      {(title || subtitle) && (
        <header className={classes.header}>
          {title && <h2>{title}</h2>}
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
        </header>
      )}
      {columns === "irregular-3-2" && (
        <EditorHints
          hints={() => {
            const { length } = getChildNodes(currentNode, -1);
            return {
              "Optimal number of items": [0, 1].includes(length % 3) && [0, 2].includes(length % 5),
            };
          }}
        >
          (Use 7, 10, 12, 15...)
        </EditorHints>
      )}
      {columns === "irregular-67-33" && (
        <EditorHints
          hints={() => {
            const { length } = getChildNodes(currentNode, -1);
            return { "Optimal number of items": length % 2 === 0 };
          }}
        >
          (Use an even number of items)
        </EditorHints>
      )}
      <div className={classes.wrapper} data-width={width} data-cut={cut}>
        <div className={clsx(classes.grid, "_container")} data-columns={columns} data-gap={gap}>
          <RenderChildren />
        </div>
      </div>
      {cta.ctaType !== "none" && (
        <p className="_center-4">
          <MixinCTA {...{ cta }} />
        </p>
      )}
    </section>
  ),
);
