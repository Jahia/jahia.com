import {
  getChildNodes,
  Island,
  jahiaComponent,
  Render,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import type { CSSProperties } from "react";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import Carousel from "../ResourceCarousel/Carousel.client.jsx";
import section from "../Section/component.module.css";
import classes from "./component.module.css";
import type { CardCarouselProps } from "./types.js";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:cardCarousel" },
  (
    {
      "jcr:title": title,
      eyebrow,
      subtitle,
      theme,
      background,
      desktopCards = "3",
      tabletCards = "2",
      cardSpacing = "normal",
      showArrows = true,
      showPagination = true,
      ...cta
    }: CardCarouselProps,
    { currentNode, renderContext },
  ) => {
    const headingId = `carousel-${currentNode.getIdentifier()}`;
    const layout = {
      desktop: Number(desktopCards),
      tablet: Math.min(Number(tabletCards), Number(desktopCards)),
      gap: { compact: "1rem", normal: "1.5rem", large: "2rem" }[cardSpacing],
    };
    const cards = getChildNodes(
      currentNode,
      -1,
      0,
      (node) => node.isNodeType("jahiacom:card") && node.hasPermission("jcr:read"),
    );
    return (
      <section
        id={currentNode.getName()}
        className={section.container}
        data-theme={theme}
        data-bg={background}
      >
        {(title || subtitle || eyebrow) && (
          <header className={section.header}>
            {eyebrow && <p className={section.eyebrow}>{eyebrow}</p>}
            {title && <h2 id={headingId}>{title}</h2>}
            {subtitle && (
              <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />
            )}
          </header>
        )}
        <div className={section.wrapper}>
          {renderContext.isEditMode() ? (
            <div
              className={classes.editorGrid}
              style={
                {
                  "--carousel-desktop": layout.desktop,
                  "--carousel-tablet": layout.tablet,
                  "--carousel-gap": layout.gap,
                } as CSSProperties
              }
            >
              <RenderChildren />
            </div>
          ) : cards.length > 0 ? (
            <Island
              component={Carousel}
              props={{
                itemCount: cards.length,
                labelledBy: title ? headingId : undefined,
                showArrows,
                showPagination,
                layout,
              }}
            >
              {cards.map((node) => (
                <div key={node.getIdentifier()} className={classes.item} data-carousel-item="">
                  <Render node={node} />
                </div>
              ))}
            </Island>
          ) : null}
        </div>
        {cta.ctaType !== "none" && (
          <p className="_center-4">
            <MixinCTA cta={cta} location="cardCarousel" name={currentNode.getName()} />
          </p>
        )}
      </section>
    );
  },
);
