import { jahiaComponent } from "@jahia/javascript-modules-library";
import Buttons from "../HeroWithoutImage/Buttons.jsx";
import type { Props } from "../HeroWithoutImage/types.js";
import classes from "./component.module.css";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:heroWithoutImage", name: "authors" },
  ({ "jcr:title": title, subtitle, theme, background, ...cta }: Props, { currentNode }) => (
    <header className={classes.intro} data-theme={theme} data-bg={background}>
      <div className={classes.introContent}>
        {title && <h1>{title}</h1>}
        {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
        <Buttons cta={cta} name={currentNode.getName()} />
      </div>
    </header>
  ),
);
