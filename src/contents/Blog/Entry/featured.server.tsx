import { jahiaComponent } from "@jahia/javascript-modules-library";
import { BlogCard } from "./default.server.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
    name: "featured",
  },
  (props: Props, { currentNode, currentResource, renderContext }) => {
    const request = renderContext.getRequest();

    return (
      <BlogCard
        props={props}
        currentNode={currentNode}
        locale={currentResource.getLocale().getLanguage()}
        listingState={{
          cluster: request.getParameter("cluster") || undefined,
          theme: request.getParameter("theme") || undefined,
          page: request.getParameter("blogPage") || undefined,
        }}
        featured
      />
    );
  },
);
