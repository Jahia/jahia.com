import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "../Layout.jsx";

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jnt:page",
    name: "basic",
    displayName: "Basic page",
  },
  (props: { pageType: string }) => (
    <Layout props={props as never} pageType={props.pageType}>
      <Area name="main" nodeType="jahiacom:pageArea" />
    </Layout>
  ),
);
