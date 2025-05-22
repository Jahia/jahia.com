import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jnt:bigText",
  },
  ({ text }) => <div className="_richtext" dangerouslySetInnerHTML={{ __html: text }}></div>,
);
