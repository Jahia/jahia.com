import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import classes from "./component.module.css";
import { HeroWithoutImage } from "../../views/HeroWithoutImage/default.server.jsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resourceCategory",
    name: "fullPage",
  },
  (props: Props) => (
    <div>
      <HeroWithoutImage {...props} ctaType="none" theme="night" background="plusses" />
      <main className={classes.main}>
        <div className={classes.grid}>
          <RenderChildren />
        </div>
      </main>
    </div>
  ),
);
