import { useState } from "react";
import { useTranslation } from "react-i18next";
import classes from "../../mixins/CTA/component.module.css";

export default function Copy({ text, label }: { text: string; label: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState("");
  return (
    <div className="_stack-2">
      <span role="status" aria-live="polite">
        {status}
      </span>
      <button
        type="button"
        className={classes.cta}
        data-variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus(t("pressRoom.copied"));
          } catch {
            setStatus(t("pressRoom.copyFailed"));
          }
        }}
      >
        {label}
      </button>
    </div>
  );
}
