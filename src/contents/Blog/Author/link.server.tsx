import { jahiaComponent } from "@jahia/javascript-modules-library";
import { useAuthorReader } from "../../../views/Authors/data.server.js";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:blogAuthor", name: "link" },
  ({ name }, { currentNode }) => {
    const { profileUrl } = useAuthorReader();
    const url = profileUrl(currentNode);
    return url ? (
      <a
        href={url}
        data-element-url={url}
        data-element-type="link"
        data-element-text={name}
        data-element-location="blog_section"
        data-element-name={currentNode.getName()}
      >
        {name}
      </a>
    ) : (
      <span>{name}</span>
    );
  },
);
