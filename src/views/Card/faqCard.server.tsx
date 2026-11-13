import { jahiaComponent } from "@jahia/javascript-modules-library";
import { sanitizeHtml } from "../../contents/GlossaryEntry/sanitizeHtml.js";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import FaqCard from "./FaqCard.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:card", name: "hidden.faqCard" },
  ({ "jcr:title": title, body, icon, ...cta }: Props, { currentNode }) => (
    <FaqCard
      title={title || currentNode.getName()}
      icon={icon && <img src={icon.getUrl()} alt="" width={24} height={24} />}
    >
      {body && <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }} />}
      {cta.ctaType !== "none" && (
        <p>
          <MixinCTA cta={cta} location="faq_section" name={currentNode.getName()} />
        </p>
      )}
    </FaqCard>
  ),
);
