import { getChildNodes, jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import { richTextPlainText } from "../../contents/GlossaryEntry/faqItems.js";
import classes from "./cards.module.css";

export const renderFaqCards = jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:accordion",
    name: "cards",
    displayName: "Cartes à chevrons",
  },
  (_, { currentNode, renderContext }) => {
    const items = renderContext.isEditMode()
      ? []
      : getChildNodes(currentNode, -1, 0, (node) => node.isNodeType("jahiacom:card"))
          .map((node) => ({
            question: richTextPlainText(node.getPropertyAsString("jcr:title") || ""),
            answer: richTextPlainText(node.getPropertyAsString("body") || ""),
          }))
          .filter(({ question, answer }) => question && answer);

    return (
      <div className={classes.cards} data-faq-cards="">
        <RenderChildren view="hidden.faqCard" />
        {items.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": items.map(({ question, answer }) => ({
                  "@type": "Question",
                  "name": question,
                  "acceptedAnswer": { "@type": "Answer", "text": answer },
                })),
              }).replaceAll("<", "\\u003c"),
            }}
          />
        )}
      </div>
    );
  },
);
