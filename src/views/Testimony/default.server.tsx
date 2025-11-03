import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { MixinCTA, type CTAProps } from "../../mixins/CTA/server.jsx";
import classes from "./styles.module.css";
import { Image } from "../../components/Image.jsx";

type Props = {
  author?: string;
  quote: string;
  image?: JCRNodeWrapper;
} & CTAProps;

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:testimony",
  },
  ({ author, quote, image, ...cta }: Props) => (
    <section className={classes.container}>
      {image && <Image image={image} style={{ width: "100px" }} />}
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
