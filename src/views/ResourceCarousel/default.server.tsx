import {
  Island,
  jahiaComponent,
  useJCRQuery,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { Image } from "../../components/Image.jsx";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import Carousel from "./Carousel.client.jsx";
import { RESOURCE_MODEL } from "./contentModel.js";
import { sanitizeCount, selectResources } from "./selection.server.js";
import type { ResourceCardData, ResourceCarouselProps } from "./types.js";
import classes from "./component.module.css";

const getSiteRoot = (node: JCRNodeWrapper) => {
  const match = node.getPath().match(/^\/sites\/[^/]+/);
  return match?.[0] || "/sites";
};

const nodes = (value?: Array<JCRNodeWrapper | null>) =>
  (value || []).filter((node): node is JCRNodeWrapper => node !== null);

const nodeIds = (value?: Array<JCRNodeWrapper | null>) =>
  nodes(value).map((node) => node.getIdentifier());

const Card = ({
  item,
  blogLabel,
  discoverLabel,
  locale,
}: {
  item: ResourceCardData;
  blogLabel: string;
  discoverLabel: string;
  locale: string;
}) => (
  <article className={classes.card}>
    <a
      className={classes.cardLink}
      href={item.url}
      data-element-url={item.url}
      data-element-type="link"
      data-element-text={item.title}
      data-element-location="resource_carousel"
      data-element-name={item.id}
    >
      <div className={classes.image}>
        {item.image ? (
          <Image image={item.image} sizes={[360, 720]} />
        ) : (
          <span className={classes.imageFallback}>{blogLabel}</span>
        )}
        <span className={classes.badge}>{blogLabel}</span>
      </div>
      <div className={classes.content}>
        <div className={classes.meta}>
          <span>{blogLabel}</span>
          {item.date && (
            <time dateTime={item.date}>{new Date(item.date).toLocaleDateString(locale)}</time>
          )}
        </div>
        <h3>{item.title}</h3>
        {item.description && <p>{item.description}</p>}
        <span className={classes.readMore}>
          {discoverLabel} <span aria-hidden="true">→</span>
        </span>
      </div>
    </a>
  </article>
);

export function ResourceCarousel(props: ResourceCarouselProps) {
  const { currentNode, mainNode, currentResource, renderContext } = useServerContext();
  const { t } = useTranslation();
  const title = props["jcr:title"] || t("resourceCarousel.defaultTitle");

  if (props.hidden) {
    return renderContext.isEditMode() ? (
      <p className={classes.editorNotice}>{t("resourceCarousel.hiddenInEdit")}</p>
    ) : null;
  }

  const count = sanitizeCount(props.itemCount);
  const mode = props.selectionMode || "automatic";
  const rootPath = props.sourceRoot?.getPath() || getSiteRoot(mainNode || currentNode);
  const candidates = useJCRQuery({
    query: `
        SELECT * FROM [${RESOURCE_MODEL.nodeType}]
        WHERE ISDESCENDANTNODE(${JSON.stringify(rootPath)})
        ORDER BY [${RESOURCE_MODEL.properties.date}] DESC
      `,
  });
  const clusterNodes =
    mode === "filtered"
      ? nodes(props.filteredBlogTypes ?? props.clusters)
      : mode === "manual"
        ? nodes(props.manualBlogTypes ?? props.clusters)
        : [];
  const manualNodes = mode === "manual" ? nodes(props.selectedResources ?? props.manualItems) : [];
  const isBlogCarousel = currentNode.getParent().isNodeType("jahiacom:blogResourceCarouselArea");
  const items = selectResources({
    candidates,
    manualNodes,
    currentNode: mainNode || currentNode,
    count,
    mode,
    clusterIds: nodeIds(clusterNodes),
    completeFallback: props.completeFallback !== false,
    minimumItems: props.minimumItems ?? (isBlogCarousel ? 1 : 6),
  });

  for (const dependency of [...candidates, ...manualNodes, ...clusterNodes]) {
    server.render.addCacheDependency({ path: dependency.getPath() }, renderContext);
  }

  if (items.length === 0) {
    return renderContext.isEditMode() ? (
      <p className={classes.editorNotice}>{t("resourceCarousel.emptyInEdit")}</p>
    ) : null;
  }

  const id = `resource-carousel-${currentNode.getIdentifier()}`;
  const locale = currentResource.getLocale().getLanguage();
  const blogLabel = t("resourceCarousel.blog");
  const discoverLabel = t("resourceCarousel.discover");

  return (
    <section
      className={classes.section}
      aria-labelledby={id}
      data-theme={props.theme}
      data-bg={props.background}
    >
      <div className={classes.inner}>
        <header className={classes.header}>
          <p className={classes.eyebrow}>{t("resourceCarousel.eyebrow")}</p>
          <h2 id={id}>{title}</h2>
          {props.subtitle && <p className={classes.subtitle}>{props.subtitle}</p>}
        </header>
        <Island component={Carousel} props={{ itemCount: items.length }}>
          {items.map((item) => (
            <Card
              key={item.id}
              item={item}
              blogLabel={blogLabel}
              discoverLabel={discoverLabel}
              locale={locale}
            />
          ))}
        </Island>
        {props.ctaType && props.ctaType !== "none" && (
          <div className={classes.ctaRow}>
            <MixinCTA cta={props} location="resource_carousel" name={currentNode.getName()} />
          </div>
        )}
      </div>
    </section>
  );
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resourceCarousel",
  },
  (props: ResourceCarouselProps) => <ResourceCarousel {...props} />,
);
