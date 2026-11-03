import {
  AddResources,
  buildModuleFileUrl,
  getChildNodes,
  Island,
  jahiaComponent,
  Render,
  RenderChildren,
  server,
} from "@jahia/javascript-modules-library";
import type { CSSProperties } from "react";
import Carousel from "./Carousel.client.jsx";
import { carouselLayout } from "./layout.js";
import RichText from "../../RichText.jsx";
import type { CarouselProps } from "./types.js";
import classes from "./component.module.css";

export const CardCarousel = jahiaComponent(
  { componentType: "view", nodeType: "jahiacardcarousel:carousel" },
  (props: CarouselProps, { currentNode, currentResource, renderContext }) => {
    const {
      "jcr:title": title,
      eyebrow,
      subtitle,
      showArrows = true,
      showPagination = true,
    } = props;
    const headingId = `card-carousel-${currentNode.getIdentifier()}`;
    const layout = carouselLayout(props);
    const locale = currentResource.getLocale();
    const cards = getChildNodes(
      currentNode,
      -1,
      0,
      (node) => node.isNodeType("jmix:droppableContent") && node.hasPermission("jcr:read"),
    ).filter((node) => {
      server.render.addCacheDependency({ path: node.getPath() }, renderContext);
      return node.hasI18N(locale);
    });
    return (
      <>
        <AddResources type="css" resources={buildModuleFileUrl("dist/assets/style.css")} />
        <section className={classes.section} data-theme={props.theme || "day"}>
          {(title || subtitle || eyebrow) && (
            <header className={classes.header}>
              {eyebrow && <p className={classes.eyebrow}>{eyebrow}</p>}
              {title && <h2 id={headingId}>{title}</h2>}
              <RichText html={subtitle} />
            </header>
          )}
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
        </section>
      </>
    );
  },
);
