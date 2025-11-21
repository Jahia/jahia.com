import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { MixinCTA, type CTAProps } from "../../mixins/CTA/server.jsx";
import classes from "./styles.module.css";
import { Image } from "../../components/Image.jsx";

type Props = {
  author?: string;
  quote: string;
  image?: JCRNodeWrapper;
  theme?: string;
  background?: string;
} & CTAProps;

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:testimony",
    name: "cover",
  },
  ({ author, quote, image, theme, background, ...cta }: Props) => (
    <section className={classes.container} data-theme={theme} data-bg={background}>
      <div className={classes.testimonyCover}>
        <div className={classes.imageCover}>
          {image && <Image image={image} className={classes.image} />}
        </div>
        <div className={classes.text}>
          <div className="_richtext">
            <blockquote dangerouslySetInnerHTML={{ __html: quote }}></blockquote>
          </div>
          {author && <p className={classes.author}>— {author}</p>}
          {cta.ctaType !== "none" && (
            <p style={{ marginTop: "1rem" }}>
              <MixinCTA cta={cta} />
            </p>
          )}
        </div>
      </div>
    </section>
  ),
);
