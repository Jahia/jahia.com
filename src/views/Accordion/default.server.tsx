import { jahiaComponent } from "@jahia/javascript-modules-library";
import { renderFaqCards } from "./cards.server.jsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:accordion",
    displayName: "Cartes à chevrons (par défaut)",
  },
  renderFaqCards,
);
