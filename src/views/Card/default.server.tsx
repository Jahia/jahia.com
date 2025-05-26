import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { MixinCTA, type CTAProps } from "../../mixins/CTA/server.jsx";

type Props = {
  "jcr:title"?: string;
  "body"?: string;
} & CTAProps;

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:card",
  },
  ({ "jcr:title": title, body, ...cta }: Props) => (
    <article className={classes.card}>
      <h3>{title}</h3>
      {body && (
        <div className="_richtext" style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: body }} />
      )}
      {cta.ctaType !== "none" && (
        <p>
          <MixinCTA cta={cta} />
        </p>
      )}
    </article>
  ),
);
