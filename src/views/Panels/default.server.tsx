import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import { Container, type ContainerProps } from "../../theme/index.jsx";

jahiaComponent({ componentType: "view", nodeType: "jahiacom:panels" }, (props: ContainerProps) => (
  <Container {...props}>
    <RenderChildren />
  </Container>
));
