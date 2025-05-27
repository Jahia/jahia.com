import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { HTMLAttributes } from "react";

/** This component creates a <picture> element for an image node, enhanced for Cloudimage. */
export const Image = ({
  image,
  maxWidth,
  ...props
}: { image: JCRNodeWrapper; maxWidth: number } & HTMLAttributes<HTMLImageElement>) => {
  const src = buildNodeUrl(image);
  const alt = image.getPropertyAsString("jcr:title");
  const width = image.getPropertyAsString("j:width");
  const height = image.getPropertyAsString("j:height");

  return (
    <img
      src={`${src}?w=${maxWidth}`}
      srcSet={`${src}?w=${maxWidth * 2} 2x`}
      alt={alt}
      width={width}
      height={height}
      {...props}
    />
  );
};
