import { jahiaComponent } from "@jahia/javascript-modules-library";
import Collapsible from "./Collapsible.jsx";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:card", name: "hidden.collapsible" },
  ({ "jcr:title": title, body, icon, ...cta }: Props, { renderContext, currentNode }) => (
    <Collapsible
      id={`faq-${currentNode.getIdentifier()}`}
      title={title}
      expanded={renderContext.isEditMode()}
      icon={
        icon && (
          <img
            loading="lazy"
            src={`${icon.getUrl()}?w=48&h=48`}
            alt={icon.getPropertyAsString("jcr:title")}
            width="24"
            height="24"
          />
        )
      }
    >
      {body && <div className="_richtext" dangerouslySetInnerHTML={{ __html: body }} />}
      {cta.ctaType !== "none" && (
        <p>
          <MixinCTA cta={cta} location="faq_section" name={currentNode.getName()} />
        </p>
      )}
    </Collapsible>
  ),
);
