import clsx from "clsx";
import { t } from "i18next";
import { useEffect, useState } from "react";
import classes from "./component.module.css";

export default function () {
  const [confetti, setConfetti] = useState<typeof import("canvas-confetti")>();

  useEffect(() => {
    // This library only works client-side, import it dynamically in an effect
    import("canvas-confetti").then(({ default: confetti }) => {
      setConfetti(() => confetti);
    });
  });

  return (
    <button
      className={clsx(classes.button, confetti && classes.hydrated)}
      type="button"
      onClick={() => {
        if (!confetti) return;
        confetti({ origin: { x: 0, y: 1 }, angle: 70, startVelocity: 60 });
        confetti({ origin: { x: 1, y: 1 }, angle: 110, startVelocity: 60 });
      }}
    >
      <span className={classes.before}>{t("AI95bg1EJsr48SR-4f_pl")}</span>
      <span className={classes.after}>{t("hBBhbeE0-a4KS9HVFPsOz")}</span>
    </button>
  );
}
