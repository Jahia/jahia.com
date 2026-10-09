import { jahiaComponent } from "@jahia/javascript-modules-library";
import { BlogCard } from "./default.server.jsx";
import type { Props } from "./types.js";

for (const name of ["featured", "featuredLead"] as const) {
  jahiaComponent(
    {
      componentType: "view",
      nodeType: "jahiacom:blogEntry",
      name,
    },
    (props: Props, { currentNode, currentResource, renderContext }) => {
      const request = renderContext.getRequest();

      return (
        <BlogCard
          props={props}
          currentNode={currentNode}
          locale={currentResource.getLocale().getLanguage()}
          listingState={{
            filter1: request.getParameter("filter1") || undefined,
            filter2: request.getParameter("filter2") || undefined,
            page: request.getParameter("blogPage") || undefined,
          }}
          featured
          featuredLead={name === "featuredLead"}
        />
      );
    },
  );
}
