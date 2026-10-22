import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Image } from "./Image.jsx";
import classes from "./CardMedia.module.css";

export default function CardMedia({
  image,
  theme = "cloudy",
  background,
}: {
  image?: JCRNodeWrapper;
  theme?: "day" | "cloudy" | "night";
  background?: string;
}) {
  return (
    <div
      className={classes.media}
      data-theme={theme}
      data-bg={background}
      aria-hidden={image ? undefined : true}
    >
      {image && <Image image={image} sizes={[720, 1440]} />}
    </div>
  );
}
