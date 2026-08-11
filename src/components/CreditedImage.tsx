import type { ComponentProps } from "react";
import clsx from "clsx";
import { Image } from "./Image.jsx";
import classes from "./CreditedImage.module.css";

type Props = ComponentProps<typeof Image> & {
  credit?: string;
  figureClassName?: string;
  overlayCredit?: boolean;
};

/** Keep the existing image markup when no credit is provided. */
export const CreditedImage = ({
  credit,
  figureClassName,
  overlayCredit = false,
  ...imageProps
}: Props) => {
  if (!credit) return <Image {...imageProps} />;

  return (
    <figure className={clsx(classes.figure, figureClassName, overlayCredit && classes.overlay)}>
      <Image {...imageProps} />
      <figcaption className={classes.credit}>{credit}</figcaption>
    </figure>
  );
};
