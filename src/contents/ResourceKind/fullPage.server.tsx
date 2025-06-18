import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:resourceCategory",
    name: "fullPage",
  },
  ({ "jcr:title": title }) => (
    <div>
      <header>
        <h1 style={{ color: "white" }}>{title}</h1>
      </header>
      <main>
        <RenderChildren />
      </main>
    </div>
  ),
);
