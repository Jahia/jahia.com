import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

interface Props {
  "jcr:title"?: string;
  "jcr:description"?: string;
  "j:tagList"?: string[];
  "openGraphImage"?: JCRNodeWrapper;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jnt:page",
  },
  (
    {
      "jcr:title": title,
      "jcr:description": description,
      "j:tagList": tags,
      openGraphImage,
    }: Props,
    { currentNode },
  ) => (
    <article>
      <h3>
        <a href={buildNodeUrl(currentNode)}> {title || "no title"}</a>
      </h3>
      <p>{description || "no description"}</p>
      <p>Tags: {tags ? tags.join(", ") : "no tags"}</p>
      {openGraphImage && (
        <p>
          <img src={buildNodeUrl(openGraphImage)} alt="" />
        </p>
      )}
    </article>
  ),
);
