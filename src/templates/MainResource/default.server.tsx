import { jahiaComponent, Render } from "@jahia/javascript-modules-library";
import { Layout } from "../Layout.jsx";

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jmix:mainResource",
    priority: -1, // allow to overwrite this template by defining a component with a higher priority. When not specified, the default priority is 0
  },
  (props, { currentNode }) => (
    <Layout props={props}>
      <Render node={currentNode} view="fullPage" />
    </Layout>
  ),
);

// Also register the "content folder" preview because reasons
jahiaComponent(
  {
    componentType: "view",
    nodeType: "jmix:mainResource",
    name: "cm",
  },
  (props, { currentNode }) => (
    <Layout props={props}>
      <Render node={currentNode} view="fullPage" />
    </Layout>
  ),
);
