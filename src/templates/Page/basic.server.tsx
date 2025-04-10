import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Layout } from "../Layout.jsx";

interface Props {
  "jcr:title": string;
  "jcr:description"?: string;
  "seoKeywords"?: string[];
  "openGraphImage"?: JCRNodeWrapper;
}

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jnt:page",
    name: "basic",
    displayName: "Basic page",
  },
  ({
    "jcr:title": title,
    "jcr:description": description,
    "seoKeywords": keywords,
    openGraphImage,
  }: Props) => (
    <Layout
      title={title}
      description={description}
      keywords={keywords}
      openGraphImage={openGraphImage}
    >
      <Area name="main" />
    </Layout>
  ),
);
