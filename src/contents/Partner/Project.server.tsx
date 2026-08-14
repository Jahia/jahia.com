import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Image } from "../../components/Image.jsx";
import classes from "./profile.module.css";

interface Props {
  "jcr:title": string;
  "sector"?: string;
  "projectType"?: string;
  "description"?: string;
  "image"?: JCRNodeWrapper;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:partnerProject",
  },
  ({ "jcr:title": title, sector, projectType, description, image }: Props) => (
    <article className={classes.project}>
      <div className={classes.projectImage}>
        {image ? <Image image={image} sizes={[360, 720]} /> : <span>{sector || title}</span>}
      </div>
      <div className={classes.projectCopy}>
        {sector && <small>{sector}</small>}
        <h3>{title}</h3>
        {projectType && <strong className={classes.projectType}>{projectType}</strong>}
        {description && <p>{description}</p>}
      </div>
    </article>
  ),
);
