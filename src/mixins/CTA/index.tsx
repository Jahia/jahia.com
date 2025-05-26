import type { AnchorHTMLAttributes } from "react";
import classes from "./component.module.css";

export const CTA = ({
  children,
  icon,
  secondary,
  ...props
}: {
  icon?: boolean | string;
  secondary?: boolean;
} & AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a {...props} className={classes.cta} data-variant={secondary ? "secondary" : undefined}>
    {children}
    {icon && (
      <>
        <span className={classes.line} />
        <span className={icon === true ? "i-ri:arrow-right-wide-line" : icon} />
      </>
    )}
  </a>
);
