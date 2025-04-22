import {
  getChildNodes,
  HydrateInBrowser,
  jahiaComponent,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import Accordion from "./Accordion.client.jsx";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:accordion" },
  (_, { currentNode, renderContext }) => {
    // In edit mode, render all nodes through Jahia rendering chain to make them editable
    if (renderContext.isEditMode()) {
      return (
        <section className="_stack-3">
          <RenderChildren />
        </section>
      );
    }

    // Otherwise, fetch child nodes, retrieve their props and create an interactive component
    const items = getChildNodes(currentNode, -1, 0, (node) =>
      node.isNodeType("jahiacom:accordionItem"),
    ).map((node) => ({
      key: node.getName(),
      title: node.getPropertyAsString("jcr:title") ?? "",
      body: node.getPropertyAsString("body") ?? "",
    }));

    return (
      <>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": items.map(({ title, body }) => ({
              "@type": "Question",
              "name": title,
              "acceptedAnswer": {
                "@type": "Answer",
                // Basic HTML sanitization to remove tags
                "text": body.replaceAll(/<[^>]+>/g, "").trim(),
              },
            })),
          })}
        </script>
        <HydrateInBrowser child={Accordion} props={{ items }} />
      </>
    );
  },
);
