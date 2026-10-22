import { jahiaComponent } from "@jahia/javascript-modules-library";
import { Card } from "./default.server.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:card",
    name: "compact",
  },
  (props: Props, context) => Card({ ...props, compact: true }, context),
);
