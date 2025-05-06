import clsx from "clsx";
import type { HTMLAttributes } from "react";
import classes from "./theme.module.css";

export type Theme = "day" | "cloudy" | "night";
export type ContainerProps = {
  "jcr:title"?: string;
  "subtitle"?: string;
  "theme"?: Theme;
  "background"?: "plusses" | "stripes";
};

export const Container = ({
  "jcr:title": title,
  subtitle,
  theme,
  background,
  children,
  ...props
}: ContainerProps & HTMLAttributes<HTMLElement>) => (
  <section
    {...props}
    className={clsx(props.className, classes.container)}
    data-theme={theme}
    data-bg={background}
  >
    {(title || subtitle) && (
      <header className={classes.header}>
        {title && <h2>{title}</h2>}
        {subtitle && <p>{subtitle}</p>}
      </header>
    )}
    {children}
  </section>
);
