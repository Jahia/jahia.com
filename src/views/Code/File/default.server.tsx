import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:codeFile",
  },
  ({ contents }: { contents: string }) => (
    <div className="_richtext" dangerouslySetInnerHTML={{ __html: contents }} />
  ),
);
