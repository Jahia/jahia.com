import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { Image } from "../../../components/Image.jsx";
import { useAuthorReader } from "../../../views/Authors/data.server.js";
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
  ({ name, image, text }: Props, { currentNode }) => {
    const { t } = useTranslation();
    const { profileUrl } = useAuthorReader();
    const url = profileUrl(currentNode);
    return (
      <div className={classes.author} data-theme="night">
        {image && <Image image={image} />}
        <div className={classes.bio}>
          <h3>{name}</h3>
          <div className="_richtext" dangerouslySetInnerHTML={{ __html: text || "" }} />
          {url && (
            <p>
              <a className={classes.profileLink} href={url}>
                {t("authors.viewProfile")}
              </a>
            </p>
          )}
        </div>
      </div>
    );
  },
);
