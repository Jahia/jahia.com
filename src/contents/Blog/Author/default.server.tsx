import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Image } from "../../../components/Image.jsx";
import classes from "./styles.module.css";

interface Props {
  name: string;
  image?: JCRNodeWrapper;
  text?: string;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogAuthor",
  },
  ({ name, image, text }: Props) => (
    <div className={classes.author} data-theme="night">
      {image && <Image image={image} />}
      <div className={classes.bio}>
        <h3>{name}</h3>
        <div className="_richtext" dangerouslySetInnerHTML={{ __html: text || "" }} />
      </div>
    </div>
  ),
);
