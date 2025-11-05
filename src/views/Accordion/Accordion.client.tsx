import { type ReactNode } from "react";

export default function Accordion({ children }: { children?: ReactNode }) {
  return (
    <section
      className="_stack-0"
      onClick={(event) => {
        const button = (event.target as HTMLElement | undefined)?.closest?.("button");
        if (!button) return; // Ignore clicks outside of buttons

        const card = button.closest("article");
        if (!card) return;

        if (card.getAttribute("aria-expanded") === "true") {
          // If the card is expanded, collapse it
          card.setAttribute("aria-expanded", "false");
        } else {
          // If the card is collapsed, collapse others and expand this one
          const openCards = event.currentTarget.querySelectorAll("article[aria-expanded='true']");
          for (const openCard of openCards) openCard.setAttribute("aria-expanded", "false");
          card.setAttribute("aria-expanded", "true");
        }
      }}
    >
      {children}
    </section>
  );
}
