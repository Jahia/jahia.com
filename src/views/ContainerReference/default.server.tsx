import { buildNodeUrl, jahiaComponent, Render } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:containerReference" },
  ({ container }: { container?: JCRNodeWrapper }, { renderContext }) =>
    renderContext.isEditMode() ? (
      <div style={{ border: "2px solid #F8EAB0" }}>
        {container ? (
          <>
            <div style={{ background: "#F8EAB0", padding: ".5rem" }}>
              This is a reference to another container:{" "}
              <a
                href={buildNodeUrl(
                  server.render.findDisplayableNode(container, renderContext, null),
                )}
              >
                view the original.
              </a>{" "}
              <strong>All changes will be shared across all references.</strong>
            </div>
            <Render node={container} readOnly />
          </>
        ) : (
          <div style={{ background: "#F8EAB0", padding: ".5rem" }}>
            This used to be a reference to another container, but the reference was deleted. You can
            delete this section.
          </div>
        )}
      </div>
    ) : container ? (
      <Render node={container} />
    ) : (
      <></>
    ),
);
