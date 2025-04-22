import { useState } from "react";
import classes from "./Item/component.module.css";

export default function Accordion({
  items,
}: {
  items: Array<{ key: string; title: string; body: string }>;
}) {
  const [current, setCurrent] = useState<string>();

  return (
    <section className="_stack-3">
      {items.map(({ key, title, body }) => (
        <article key={key} className={classes.item} aria-expanded={current === key}>
          <h3 className={classes.header}>
            <button
              type="button"
              className={classes.toggle}
              onClick={() => setCurrent((prev) => (prev === key ? undefined : key))}
            >
              <span style={{ flex: 1 }}>{title}</span>
              <span className={classes.button}>
                <span className="i-ri:add-line" aria-label={current === key ? "Close" : "Open"} />
              </span>
            </button>
          </h3>
          <div className={classes.body} inert={current !== key}>
            <div
              style={{ padding: "1rem" }}
              // eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml
              dangerouslySetInnerHTML={{ __html: body }}
            />
          </div>
        </article>
      ))}
    </section>
  );
}
