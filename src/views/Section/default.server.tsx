import { getChildNodes, jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import EditorHints from "../../components/EditorHints.jsx";
import { MixinCTA, type CTAProps } from "../../mixins/CTA/server.jsx";
import type { ContainerProps } from "../../theme/index.jsx";
import classes from "./component.module.css";

type Columns =
  | "100"
  | "50-50"
  | "67-33"
  | "33-67"
  | "irregular-67-33"
  | "33-33-33"
  | "25-25-25-25"
  | "irregular-1-2"
  | "irregular-3-2"; // Historical stored key; the wide layout starts with two items.
type Width = "100" | "75" | "50";
type Gap = "0" | "1" | "2";

const layoutChecks: Partial<Record<Columns, (count: number) => boolean>> = {
  "irregular-1-2": (count) => [0, 1].includes(count % 3),
  "irregular-3-2": (count) => [0, 1].includes(count % 3) && [0, 2].includes(count % 5),
  "irregular-67-33": (count) => count % 2 === 0,
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:section",
  },
  (
    {
      "jcr:title": title,
      eyebrow,
      subtitle,
      columns,
      width,
      gap,
      theme,
      background,
      ...cta
    }: {
      "jcr:title"?: string;
      "eyebrow"?: string;
      "subtitle"?: string;
      "columns": Columns;
      "width": Width;
      "gap": Gap;
    } & ContainerProps &
      CTAProps,
    { currentNode },
  ) => {
    const { t } = useTranslation();
    const layoutCheck = layoutChecks[columns];
    return (
      <section
        id={currentNode.getName()}
        className={classes.container}
        data-theme={theme}
        data-bg={background}
      >
        {(title || subtitle) && (
          <header className={classes.header}>
            {eyebrow && <p className={classes.eyebrow}>{eyebrow}</p>}
            {title && <h2>{title}</h2>}
            {subtitle && (
              <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />
            )}
          </header>
        )}
        {layoutCheck && (
          <EditorHints
            booleanLabels={{
              true: t("sectionLayout.complete"),
              false: t("sectionLayout.incomplete"),
            }}
            hints={() => ({
              [t("sectionLayout.rows")]: layoutCheck(getChildNodes(currentNode, -1).length),
            })}
          >
            {t(`sectionLayout.${columns}`)}
          </EditorHints>
        )}
        <div className={classes.wrapper} data-width={width}>
          <div
            className={clsx(
              classes.grid,
              // _container means that children objects can have a cut corner under the right conditions
              // (e.g. first or last in container)
              // Never allow children to do cut corners if gap is 0, the corners are cut on the grid itself
              { _container: gap !== "0" },
            )}
            data-columns={columns}
            data-gap={gap}
          >
            <RenderChildren />
          </div>
        </div>
        {cta.ctaType !== "none" && (
          <p className="_center-4">
            <MixinCTA cta={cta} location="section" name={currentNode.getName()} />
          </p>
        )}
      </section>
    );
  },
);
