import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { MixinCTA, type CTAProps } from "../../mixins/CTA/server.jsx";
import classes from "./component.module.css";
import { Image } from "../../components/Image.jsx";

type Props = {
  author?: string;
  title: string;
  subtitle: string;
  image?: JCRNodeWrapper;
  theme?: string;
  background?: string;
} & CTAProps;

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:discover",
  },
  ({ author, title, subtitle, image, theme, background, ...cta }: Props) => (
    <section className={classes.container} data-theme={theme} data-bg={background}>
      <div className={classes.discover}>
        <div className={classes.imageDiscover}>{image && <Image image={image} />}</div>

        <h2>{title}</h2>

        <div className={classes.textDiscover}>
          <div className="_richtext">
            <p dangerouslySetInnerHTML={{ __html: subtitle }} />
          </div>
          <p style={{ marginTop: "1rem", position: "relative", zIndex: 1 }}>
            <MixinCTA cta={cta} />
          </p>
        </div>
      </div>
    </section>
  ),
);
