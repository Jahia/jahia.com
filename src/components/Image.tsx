import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ImgHTMLAttributes } from "react";

/**
 * Array of default image sizes to create in the `srcset` attrbute.
 *
 * `Infinity` is used to indicate that the image should be served at its original size.
 *
 * 720 is targeted at Lighthouse/Google PageSpeed Insights recommendations.
 */
const defaultSizes = [360, 720, 1440, 1920, Infinity];

/** This component creates an <img> element for an image node, enhanced for Cloudimage. */
export const Image = ({
  image,
  sizes = defaultSizes,
  ...props
}: { image: JCRNodeWrapper; sizes?: number[] } & Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "sizes"
>) => {
  const baseSrc = buildNodeUrl(image);
  const alt = image.getPropertyAsString("jcr:title") ?? ""; // If no title is set, consider the image as decorative
  const mime = image.getNode("jcr:content")?.getPropertyAsString("jcr:mimeType") ?? "image/jpeg";

  // Ignore vector images
  if (mime.startsWith("image/svg") || mime.startsWith("image/vnd"))
    return <img loading="lazy" src={baseSrc} alt={alt} {...props} />;

  // Some imported formats (notably AVIF and WebP) may not be enriched with
  // Jahia's width/height metadata. Keep the original asset usable instead of
  // failing the complete component render.
  if (!image.hasProperty("j:width") || !image.hasProperty("j:height")) {
    return <img loading="lazy" src={baseSrc} alt={alt} {...props} />;
  }

  const width = image.getProperty("j:width").getLong();
  const height = image.getProperty("j:height").getLong();

  const src = sizes.length === 0 || sizes[0] > width ? baseSrc : `${baseSrc}?w=${sizes[0]}`;

  const srcSet: string[] = [];

  for (const size of sizes.slice(1)) {
    if (size >= width) {
      // If the size is larger than the image's width, use the original image
      srcSet.push(`${baseSrc}?w=${width} ${width}w`);
      break; // No need to add larger sizes
    }

    srcSet.push(`${baseSrc}?w=${size} ${size}w`);
  }

  return (
    <img
      loading="lazy"
      src={src}
      sizes="auto"
      srcSet={srcSet.length > 0 ? srcSet.join(", ") : undefined}
      alt={alt}
      width={width}
      height={height}
      {...props}
    />
  );
};
