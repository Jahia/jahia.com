import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

interface Props {
  name: string;
  image?: JCRNodeWrapper;
  text?: string;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jcnt:blogAuthor",
  },
  ({ name, image, text }: Props) => (
    <ul>
      <li>name: {name}</li>
      <li>image: {image ? buildNodeUrl(image) : "no image"}</li>
      <li>text: {text || "no text"}</li>
    </ul>
  ),
);
