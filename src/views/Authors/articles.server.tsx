import { jahiaComponent, Render } from "@jahia/javascript-modules-library";
import { ResourceCarousel } from "../ResourceCarousel/default.server.jsx";
import type { ResourceCarouselProps } from "../ResourceCarousel/types.js";
import { useAuthorReader } from "./data.server.js";
import classes from "./component.module.css";

// Preserve the existing carousel's selection, permissions, cache and controls.
// Only these authors pages opt into the blog's existing article cards.
jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:resourceCarousel", name: "authors" },
  (props: ResourceCarouselProps, { currentNode }) => {
    const { available } = useAuthorReader();
    return (
      <ResourceCarousel
        {...props}
        presentation={{
          className: classes.articles,
          renderHeading: (title, id, subtitle) => (
            <header className={classes.heading}>
              <h2 id={id}>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </header>
          ),
          renderItem: (item, fallback) => {
            if (item.kind !== "blog") return fallback;
            const node = currentNode.getSession().getNodeByIdentifier(item.id);
            return available(node) && node.isNodeType("jahiacom:blogEntry") ? (
              <div key={item.id} className={classes.article} data-carousel-item="">
                <Render node={node} />
              </div>
            ) : null;
          },
        }}
      />
    );
  },
);
