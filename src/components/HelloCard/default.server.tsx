import { buildModuleFileUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

jahiaComponent(
  {
    nodeType: "jahiacom:helloCard",
    componentType: "view",
  },
  ({ illustration, title }: { illustration: string; title: string }) => {
    return (
      <article className={classes.card}>
        <img src={buildModuleFileUrl(`static/illustrations/${illustration}.svg`)} alt="" />
        <p>{title}</p>
      </article>
    );
  },
);
