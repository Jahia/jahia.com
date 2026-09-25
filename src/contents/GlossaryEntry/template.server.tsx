import { jahiaComponent, Render } from "@jahia/javascript-modules-library";
import { Layout } from "../../templates/Layout.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  { componentType: "template", nodeType: "jahiacom:glossaryEntry" },
  (props: Props & { "jcr:description"?: string }, { currentNode }) => (
    <Layout
      props={{
        ...props,
        "jcr:title": props["jcr:title"] || currentNode.getDisplayableName(),
        "jcr:description": props["jcr:description"] || props.summary,
      }}
    >
      <Render node={currentNode} view="fullPage" />
    </Layout>
  ),
);
