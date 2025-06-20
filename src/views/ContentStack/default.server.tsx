import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:contentStack",
  },
  () => (
    <div className="_stack-4">
      <RenderChildren />
    </div>
  ),
);
