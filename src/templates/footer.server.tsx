import {
  AbsoluteArea,
  buildNodeUrl,
  jahiaComponent,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:pageFooter",
  },
  (
    { "jcr:title": title, legalLinks }: { "jcr:title"?: string; "legalLinks"?: JCRNodeWrapper[] },
    { currentNode },
  ) => {
    return (
      <footer style={{ background: "white", padding: "2em" }}>
        <p>{title}</p>
        <AbsoluteArea parent={currentNode} name="columns" nodeType="jahiacom:footerColumns" />
        <AbsoluteArea parent={currentNode} name="socials" nodeType="jahiacom:footerSocials" />
        <div className="_row-2">
          {(legalLinks ?? []).map((node) => (
            <a href={buildNodeUrl(node)} key={node.getIdentifier()}>
              {node.getPropertyAsString("jcr:title")}
            </a>
          ))}
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
    <div className="_row-4">
      <RenderChildren />
    </div>
  ),
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:footerColumn",
  },
  ({ "jcr:title": title, links }: { "jcr:title"?: string; "links"?: JCRNodeWrapper[] }) => (
    <div className="_stack-2">
      <strong>{title}</strong>
      {(links ?? []).map((node) => (
        <a href={buildNodeUrl(node)} key={node.getIdentifier()}>
          {node.getPropertyAsString("jcr:title")}
        </a>
      ))}
    </div>
  ),
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:footerSocials",
  },
  () => (
    <div className="_row-2">
      <RenderChildren />
    </div>
  ),
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:footerSocial",
  },
  (
    {
      "jcr:title": title,
      icon,
      href,
    }: {
      "jcr:title"?: string;
      "icon"?: JCRNodeWrapper;
      "href"?: string;
    },
    { renderContext },
  ) =>
    renderContext.isEditMode() ? (
      icon ? (
        <img src={buildNodeUrl(icon)} alt={title} />
      ) : (
        <del>{title}</del>
      )
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" title={title}>
        {icon && <img src={buildNodeUrl(icon)} alt={title} />}
      </a>
    ),
);
