import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import Code from "./Code.client.jsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:code",
  },
  () => <Island component={Code} />,
);
