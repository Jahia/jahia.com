import { jahiaComponent, Render } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";

interface Props {
  "jcr:title"?: string;
  "kind"?: JCRNodeWrapper;
  "description"?: string;
  "form"?: string;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resource",
    name: "fullPage",
  },
  ({ "jcr:title": title, description, form }: Props, { currentNode }) => (
    <article className={classes.article} data-theme="night" data-bg="plusses">
      <div className={classes.grid}>
        <div className="_stack-4">
          <p>
            <Render node={currentNode.getParent() as JCRNodeWrapper} />
          </p>
          <h1>{title}</h1>
          {description && (
            <div className="_richtext" dangerouslySetInnerHTML={{ __html: description }} />
          )}
        </div>
        {form && <div className="_richtext" dangerouslySetInnerHTML={{ __html: form }} />}
      </div>
    </article>
  ),
);
