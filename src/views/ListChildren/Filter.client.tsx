import type { ReactNode } from "react";

export default function Filter({ children }: { children: ReactNode }) {
  return (
    <form
      onChange={({ currentTarget }) => {
        const filters = [];
        for (const select of currentTarget.querySelectorAll("select")) {
          if (!select.value) continue;
          filters.push(select.name + "=" + select.value);
        }
        for (const child of currentTarget.querySelectorAll("[data-categories]")) {
          child.toggleAttribute(
            "hidden",
            !filters.every((filter) => child.getAttribute("data-categories")?.includes(filter)),
          );
        }
        history.replaceState(
          null,
          "",
          location.pathname + (filters.length > 0 ? "?" + filters.join("&") : ""),
        );
      }}
    >
      {children}
    </form>
  );
}
