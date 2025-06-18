import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "../Layout.jsx";

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jnt:page",
    name: "basic",
    displayName: "Basic page",
  },
  (props) => (
    <Layout props={props}>
      <Area name="main" nodeType="jahiacom:pageArea" />
    </Layout>
  ),
);
