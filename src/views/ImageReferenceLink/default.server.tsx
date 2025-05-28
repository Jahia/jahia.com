import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Image } from "../../components/Image.jsx";

type Props = { "jcr:title"?: string; "j:node"?: JCRNodeWrapper };

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jnt:imageReferenceLink",
    priority: 1,
  },
  ({ "jcr:title": title, "j:node": image }: Props) =>
    image ? (
      <Image image={image} alt={title ?? image.getPropertyAsString("jcr:title") ?? ""} />
    ) : (
      <span>No image referenced</span>
    ),
);
