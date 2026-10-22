import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { Props } from "./types.js";
import Buttons from "./Buttons.jsx";

export const HeroWithoutImage = jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithoutImage",
  },
  ({ theme, "jcr:title": title, subtitle, background, ...cta }: Props, { currentNode }) => (
    <header className={classes.hero} data-theme={theme} data-bg={background}>
      <div className={classes.grid}>
        {title && <h1>{title}</h1>}
        <div className="_stack-8">
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
          <Buttons cta={cta} name={currentNode.getName()} />
        </div>
      </div>
    </header>
  ),
);
