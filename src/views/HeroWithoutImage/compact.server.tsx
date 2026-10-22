import { jahiaComponent } from "@jahia/javascript-modules-library";
import { htmlToText } from "../../contents/Partner/types.js";
import type { Props } from "./types.js";
import classes from "./component.module.css";
import Buttons from "./Buttons.jsx";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:heroWithoutImage", name: "compact" },
  ({ theme, background, "jcr:title": title, subtitle, ...cta }: Props, { currentNode }) => (
    <header className={classes.compact} data-theme={theme} data-bg={background}>
      <div>
        {title && <h1>{title}</h1>}
        {subtitle && <p>{htmlToText(subtitle)}</p>}
        {cta.additionalButtonLabel && cta.additionalButtonDestination && (
          <Buttons cta={cta} name={currentNode.getName()} />
        )}
      </div>
    </header>
  ),
);
