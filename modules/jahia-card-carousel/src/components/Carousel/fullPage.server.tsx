import { jahiaComponent } from "@jahia/javascript-modules-library";
import { CardCarousel } from "./default.server.jsx";

// Support sites whose content-preview template requests a fullPage view.
jahiaComponent(
  { componentType: "view", nodeType: "jahiacardcarousel:carousel", name: "fullPage" },
  CardCarousel,
);
