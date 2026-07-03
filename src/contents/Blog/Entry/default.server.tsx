import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { Props } from "./types.js";
import classes from "./styles.module.css";
import { Image } from "../../../components/Image.jsx";
import { buildNodeUrl } from "@jahia/javascript-modules-library";
import clsx from "clsx";

type BlogCardContext = {
  currentNode: JCRNodeWrapper;
};

const BlogCard = (
    { "jcr:title": title, "jcr:description": description, author, date, image, summary }: Props,
      { currentNode }: BlogCardContext,
      ) => (
  <article className={classes.item}>
    <div className={clsx(classes.cover, "hideWhenSmall")}>
      {image && <Image image={image} />}
    </div>
    <div className="_stack-1" style={{ padding: "1rem" }}>
      <h3>
        <a
          href={buildNodeUrl(currentNode)}
          data-element-url={buildNodeUrl(currentNode)}
          data-element-type="link"
          data-element-text={title || "no title"}
          data-element-location="blog_section"
          data-element-name={currentNode.getName()}
        >
          {title || "no title"}
        </a>
      </h3>

      <div className={classes.meta}>
        <p>{author ? author.getPropertyAsString("name") : "no author"}</p>
        <time dateTime={date}>{date ? new Date(date).toLocaleDateString() : "no date"}</time>
      </div>

      <p>{summary || description}</p>
    </div>
  </article>
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
  },
  BlogCard,
);
