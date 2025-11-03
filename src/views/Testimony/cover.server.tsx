import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { MixinCTA, type CTAProps } from "../../mixins/CTA/server.jsx";
import classes from "./styles.module.css";

type Props = {
  author?: string;
  quote: string;
  image?: JCRNodeWrapper;
} & CTAProps;

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:testimony",
    name: "cover",
  },
  ({ author, quote, image, ...cta }: Props) => (
    <section
      className={classes.container}
      style={{ background: image && `url("${buildNodeUrl(image)}")` }}
    >
      <div className="_richtext">
        <blockquote dangerouslySetInnerHTML={{ __html: quote }}></blockquote>
      </div>
      {author && <p>— {author}</p>}
      {cta.ctaType !== "none" && (
        <p className="_center-4">
          <MixinCTA cta={cta} />
        </p>
      )}
    </section>
  ),
);
