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
    (props: Props, { currentNode, currentResource }) => {
      return (
        <BlogCard
          props={props}
          currentNode={currentNode}
          locale={currentResource.getLocale().getLanguage()}
          featured
          featuredLead={name === "featuredLead"}
        />
      );
    },
  );
}
