import { type ReactNode } from "react";

export default function Accordion({ children }: { children?: ReactNode }) {
  return (
    <section
      className="_stack-0"
      onClick={(event) => {
        const button = (event.target as HTMLElement | undefined)?.closest?.(
          "button[data-accordion-toggle]",
        );
        if (!button) return;
        const card = button.closest("article");
        if (!card) return;
        const expand = card.getAttribute("aria-expanded") !== "true";
        const setExpanded = (item: Element, expanded: boolean) => {
          item.setAttribute("aria-expanded", String(expanded));
          item
            .querySelector("button[data-accordion-toggle]")
            ?.setAttribute("aria-expanded", String(expanded));
          item.querySelector("[id$='-answer']")?.setAttribute("aria-hidden", String(!expanded));
        };
        for (const openCard of event.currentTarget.querySelectorAll(
          "article[aria-expanded='true']",
        ))
          setExpanded(openCard, false);
        setExpanded(card, expand);
      }}
    >
      {children}
    </section>
  );
}
