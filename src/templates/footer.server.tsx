import {
  AbsoluteArea,
  buildNodeUrl,
  jahiaComponent,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./footer.module.css";
import clsx from "clsx";
import { navigationUrl } from "./navigationUrl.js";
import { referenceLink } from "./referenceLink.js";

const footerReferenceLink = (node?: JCRNodeWrapper | null) => {
  if (!node) return undefined;
  try {
    if (!node.hasPermission("jcr:read")) return undefined;
    if (!node.isNodeType("jahiacom:footerLink"))
      return referenceLink(
        () => node,
        (target) => buildNodeUrl(target),
      );
    const type = node.getPropertyAsString("ctaType");
    const href =
      type === "internal"
        ? referenceLink(
            () => node.getProperty("j:linknode").getValue().getNode(),
            (target) => buildNodeUrl(target),
          )?.href
        : type === "external"
          ? navigationUrl(node.getPropertyAsString("j:url"))
          : undefined;
    return href
      ? { href, title: node.getDisplayableName(), id: node.getIdentifier(), name: node.getName() }
      : undefined;
  } catch {
    return undefined;
  }
};

const footerLinks = (nodes?: Array<JCRNodeWrapper | null>) =>
  nodes?.flatMap((node) => {
    const link = footerReferenceLink(node);
    return link ? [link] : [];
  });

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:pageFooter",
  },
  (
    { bottomLinks }: { bottomLinks?: Array<JCRNodeWrapper | null> },
    { currentNode, renderContext },
  ) => {
    return (
      <footer className={classes.footer} data-theme="night">
        <div>
          <AbsoluteArea parent={currentNode} name="columns" nodeType="jahiacom:footerColumns" />
          <hr />
          <div className={renderContext.isEditMode() ? classes.padded : classes.icons}>
            {renderContext.isEditMode() && (
              <AbsoluteArea parent={currentNode} name="iconsLeft" nodeType="jahiacom:footerIcons" />
            )}
            <AbsoluteArea parent={currentNode} name="iconsRight" nodeType="jahiacom:footerIcons" />
          </div>
          <hr />
          <div
            className={clsx(classes.bottomBar, classes.padded)}
            data-edit={renderContext.isEditMode()}
          >
            <div className={classes.legalLinks}>
              {footerLinks(bottomLinks)?.map((link) => (
                <a
                  href={link.href}
                  key={link.id}
                  data-element-url={link.href}
                  data-element-type="link"
                  data-element-text={link.title}
                  data-element-location="footer"
                  data-element-name={link.name}
                >
                  {link.title}
                </a>
              )) || <em>Add links here!</em>}
            </div>
            {!renderContext.isEditMode() && (
              <div className={classes.socialArea}>
                <AbsoluteArea
                  parent={currentNode}
                  name="iconsLeft"
                  nodeType="jahiacom:footerIcons"
                />
              </div>
            )}
          </div>
        </div>
      </footer>
    );
  },
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:footerColumns",
  },
  () => (
    <div className={classes.columns}>
      <RenderChildren />
    </div>
  ),
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:footerColumn",
  },
  ({
    "jcr:title": title,
    links,
    selectedLinkLabels,
  }: {
    "jcr:title"?: string;
    "links"?: Array<JCRNodeWrapper | null>;
    "selectedLinkLabels"?: string;
  }) => {
    let labels: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(selectedLinkLabels || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        labels = parsed as Record<string, unknown>;
    } catch {
      // Preserve the existing links if optional editorial labels are malformed.
    }
    return (
      <div className="_stack-2">
        <strong>{title}</strong>
        {footerLinks(links)?.map((link) => {
          const override = Object.hasOwn(labels, link.id) ? labels[link.id] : undefined;
          const label = typeof override === "string" ? override.trim() || link.title : link.title;
          return (
            <a
              href={link.href}
              key={link.id}
              data-element-url={link.href}
              data-element-type="link"
              data-element-text={label}
              data-element-location="footer"
              data-element-name={link.name}
            >
              {label}
            </a>
          );
        })}
      </div>
    );
  },
);

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:footerLinkList" },
  ({ layout = "column" }: { layout?: "column" | "row" }) => (
    <div className={layout === "row" ? "_row-2" : "_stack-2"}>
      <RenderChildren filter="jahiacom:footerLink" />
    </div>
  ),
);

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:footerLink" },
  ({ "jcr:title": title }: { "jcr:title"?: string }, { currentNode }) => {
    const href = footerReferenceLink(currentNode)?.href;
    return href ? (
      <a
        href={href}
        data-element-type="link"
        data-element-location="footer"
        data-element-name={currentNode.getName()}
      >
        {title}
      </a>
    ) : (
      <span>{title}</span>
    );
  },
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:footerIcons",
  },
  (_, { renderContext }) => (
    <div className={renderContext.isEditMode() ? "_stack-2" : "_row-2"}>
      <RenderChildren />
    </div>
  ),
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:footerIcon",
  },
  (
    {
      "jcr:title": title,
      icon,
      href,
      displayStyle = "badge",
    }: {
      "jcr:title"?: string;
      "icon"?: JCRNodeWrapper;
      "href"?: string;
      "displayStyle"?: "social" | "badge";
    },
    { renderContext, currentNode, currentResource },
  ) => {
    const invalid =
      currentNode.hasProperty("j:invalidLanguages") &&
      Array.from(currentNode.getProperty("j:invalidLanguages").getValues()).some(
        (value) => value.getString() === currentResource.getLocale().getLanguage(),
      );
    if (invalid && !renderContext.isEditMode()) return null;
    const iconClass = displayStyle === "badge" ? classes.badgeIcon : classes.socialIcon;
    const safeHref = navigationUrl(href);
    const image = referenceLink(
      () => icon,
      (node) => buildNodeUrl(node),
    );
    if (renderContext.isEditMode()) {
      return (
        <span className="_pack-2">
          {image && (
            <img loading="lazy" src={image.href} alt={title} style={{ maxHeight: "4rem" }} />
          )}
          {title || "(title missing!)"}
        </span>
      );
    }

    if (!image) return null;
    return safeHref ? (
      <a
        className={iconClass}
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        aria-label={title}
        data-element-url={href}
        data-element-type="image"
        data-element-text={`${title} image`}
        data-element-location="footer"
        data-element-name={currentNode.getName()}
      >
        <img loading="lazy" src={image.href} alt="" />
      </a>
    ) : (
      <span className={iconClass} title={title}>
        <img loading="lazy" src={image.href} alt={title} />
      </span>
    );
  },
);
