import { buildNodeUrl, Island, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import CarouselClient from "./Carousel.client.jsx";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:logoCarousel",
  },
  ({ logos, mode }: { logos?: Array<JCRNodeWrapper | null>; mode: "color" | "mono" }) => (
    <Island component={CarouselClient} props={{ mode, length: logos?.length ?? 0 }}>
      {logos
        ?.filter((logo) => logo !== null)
        .map((logo) => (
          <div
            key={logo.getName()}
            className={classes.logo}
            // @ts-expect-error CSS variable not supported in TS
            style={{ "--logo": `url("${buildNodeUrl(logo)}")` }}
          >
            {/* Include the alt text directly in the logo */}
            {logo.getPropertyAsString("jcr:title")}
          </div>
        ))}
    </Island>
  ),
);
