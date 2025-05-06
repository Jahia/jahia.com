import { buildNodeUrl, HydrateInBrowser, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import CarouselClient from "./Carousel.client.jsx";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:logoCarousel",
  },
  ({ logos, mode }: { logos: JCRNodeWrapper[]; mode: "color" | "mono" }) => (
    <HydrateInBrowser child={CarouselClient} props={{ mode, length: logos.length }}>
      {logos.map((logo) => (
        <div
          key={logo.getName()}
          className={classes.logo}
          style={{ "--logo": `url(${buildNodeUrl(logo)})` }}
        >
          {/* Include the alt text directly in the logo */}
          {logo.getPropertyAsString("jcr:title")}
        </div>
      ))}
    </HydrateInBrowser>
  ),
);
