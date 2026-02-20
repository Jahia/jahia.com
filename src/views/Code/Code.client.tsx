import type { ReactNode } from "react";
import classes from "./styles.module.css";

export default function Code({ children }: { children: ReactNode }) {
  return (
    <div
      className={classes.grid}
      onClick={({ currentTarget, target }) => {
        if (!(target instanceof HTMLInputElement)) return;
        const name = target.getAttribute("value");
        for (const child of currentTarget.querySelectorAll(`[data-name]`))
          child.toggleAttribute("hidden", child.getAttribute("data-name") !== name);
      }}
    >
      {children}
    </div>
  );
}
