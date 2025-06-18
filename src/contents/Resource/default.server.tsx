import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resource",
  },
  ({ "jcr:title": title }: { "jcr:title"?: string }, { currentNode }) => {
    return (
      <div>
        <h3>
          <a href={buildNodeUrl(currentNode)}>{title}</a>
        </h3>
      </div>
    );
  },
);
