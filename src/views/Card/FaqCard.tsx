import type { ReactNode } from "react";
import classes from "../Accordion/cards.module.css";

export default function FaqCard({
  title,
  icon,
  expanded = false,
  children,
}: {
  title: string;
  icon?: ReactNode;
  expanded?: boolean;
  children?: ReactNode;
}) {
  return (
    <details open={expanded}>
      <summary>
        {icon}
        <h3>{title}</h3>
      </summary>
      <div className={classes.answer}>{children}</div>
    </details>
  );
}
