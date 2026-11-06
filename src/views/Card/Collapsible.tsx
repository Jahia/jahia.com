import type { ReactNode } from "react";
import classes from "./component.module.css";

/** Shared presentation for FAQ cards and structured glossary questions. No schema generation. */
export default function Collapsible({
  id,
  title,
  icon,
  expanded = false,
  children,
}: {
  id: string;
  title?: ReactNode;
  icon?: ReactNode;
  expanded?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className={classes.collapsible} aria-expanded={expanded}>
      <h3 className={classes.header}>
        <button
          type="button"
          className={classes.toggle}
          data-accordion-toggle=""
          aria-expanded={expanded}
          aria-controls={`${id}-answer`}
        >
          {icon}
          <span style={{ flex: 1 }}>{title}</span>
          <span className={classes.button} aria-hidden="true">
            <span className="i-ri:add-line" />
          </span>
        </button>
      </h3>
      <div className={classes.body} id={`${id}-answer`} aria-hidden={!expanded}>
        <div className="_stack-4" style={{ padding: "0 1rem 2rem" }}>
          {children}
        </div>
      </div>
    </article>
  );
}
