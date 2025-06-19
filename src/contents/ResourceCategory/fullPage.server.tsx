import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resourceCategory",
    name: "fullPage",
  },
  ({ "jcr:title": title }: Props) => (
    <div>
      <header className={classes.header} data-theme="night" data-bg="plusses">
        <h1>{title}</h1>
      </header>
      <main className={classes.main}>
        <div className={classes.grid}>
          <RenderChildren />
        </div>
      </main>
    </div>
  ),
);
