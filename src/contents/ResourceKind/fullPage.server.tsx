import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resourceKind",
    name: "fullPage",
  },
  ({ "jcr:title": title }) => <h1>{title}</h1>,
);
