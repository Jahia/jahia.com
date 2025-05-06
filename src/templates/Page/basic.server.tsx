import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Layout } from "../Layout.jsx";
import NavBar from "./NavBar.jsx";

interface Props {
  "jcr:title": string;
  "jcr:description"?: string;
  "seoKeywords"?: string[];
  "openGraphImage"?: JCRNodeWrapper;
  "jsonLd"?: string[];
}

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jnt:page",
    name: "basic",
    displayName: "Basic page",
  },
  (
    {
      "jcr:title": title,
      "jcr:description": description,
      "seoKeywords": keywords,
      openGraphImage,
      jsonLd,
    }: Props,
    { renderContext, mainNode },
  ) => (
    <Layout
      title={title}
      description={description}
      keywords={keywords}
      openGraphImage={openGraphImage}
      jsonLd={jsonLd}
    >
      <NavBar
        site={renderContext.getSite()}
        root={renderContext.getSite().getHome()}
        current={mainNode}
      />
      <Area name="main" allowedNodeTypes={["jahiacommix:container"]} />
    </Layout>
  ),
);
