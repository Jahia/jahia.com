import { buildNodeUrl, jahiaComponent, Render, server } from "@jahia/javascript-modules-library";
import { Layout } from "../../templates/Layout.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  { componentType: "template", nodeType: "jahiacom:glossaryEntry" },
  (props: Props & { "jcr:description"?: string }, { currentNode, renderContext }) => {
    if (
      props.mergedInto &&
      props.mergedInto.getIdentifier() !== currentNode.getIdentifier() &&
      props.mergedInto.hasPermission("jcr:read") &&
      !renderContext.isEditMode()
    ) {
      server.render.addCacheDependency({ path: props.mergedInto.getPath() }, renderContext);
      // Standard Servlet response methods are absent from the library's read-only typings.
      const response = renderContext.getResponse() as unknown as {
        setStatus(status: number): void;
        setHeader(name: string, value: string): void;
      };
      response.setStatus(301);
      response.setHeader("Location", buildNodeUrl(props.mergedInto));
      return null;
    }
    return (
      <Layout
        props={{
          ...props,
          "jcr:title": props["jcr:title"] || currentNode.getDisplayableName(),
          "jcr:description": props["jcr:description"] || props.summary,
        }}
      >
        <Render node={currentNode} view="fullPage" />
      </Layout>
    );
  },
);
