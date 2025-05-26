import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import { Container, type ContainerProps } from "../../theme/index.jsx";
import classes from "./component.module.css";

type Columns = "100" | "50-50" | "67-33" | "33-67" | "33-33-33" | "25-25-25-25" | "irregular-3-2";
type Width = "100" | "75" | "50";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:section",
  },
  ({
    columns,
    width,
    ...props
  }: {
    columns: Columns;
    width: Width;
  } & ContainerProps) => (
    <Container {...props}>
      <div className={classes.grid} data-columns={columns} data-width={width}>
        <RenderChildren />
      </div>
    </Container>
  ),
);
