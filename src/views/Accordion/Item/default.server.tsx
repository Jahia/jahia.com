import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

interface Props {
  "jcr:title"?: string;
  "body": string;
}

// This component is only used in edit mode, it does not need to be interactive
jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:accordionItem",
  },
  ({ "jcr:title": title, body }: Props) => (
    <article className={classes.item} aria-expanded="true">
      <h3 className={classes.header} style={{ padding: "1rem" }}>
        {title}
      </h3>
      <div className={classes.body}>
        {/* eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml */}
        <div
          className="_richtext"
          style={{ padding: "1rem" }}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
    </article>
  ),
);
