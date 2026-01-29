import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import classes from "./styles.module.css";
import { Image } from "../../../components/Image.jsx";
import { buildNodeUrl } from "@jahia/javascript-modules-library";
import clsx from "clsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
  },
  ({ "jcr:title": title, author, date, image, summary }: Props, { currentNode }) => {
    return (
      <article className={classes.item}>
        <div className={clsx(classes.cover, "hideWhenSmall")}>
          {image && <Image image={image} />}
        </div>
        <div className="_stack-1" style={{ padding: "1rem" }}>
          <h3>
            <a href={buildNodeUrl(currentNode)}>{title || "no title"}</a>
          </h3>

          <div className={classes.meta}>
            <p>{author ? author.getPropertyAsString("name") : "no author"}</p>
            <time dateTime={date}>{date ? new Date(date).toLocaleDateString() : "no date"}</time>
          </div>

          <p>{summary}</p>
        </div>
      </article>
    );
  },
);
