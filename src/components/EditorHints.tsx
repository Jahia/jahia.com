import { useServerContext } from "@jahia/javascript-modules-library";
import type { ReactNode } from "react";

export default function EditorHints({
  title,
  hints,
  children,
  booleanLabels,
}: {
  title?: string;
  hints: () => Record<string, unknown>;
  children?: ReactNode;
  booleanLabels?: Record<"true" | "false", string>;
}) {
  const { renderContext } = useServerContext();
  if (!renderContext.isEditMode()) return;

  const list = Object.entries(hints());
  const success = list.every(([, value]) => value);

  return (
    <div
      className="_row-2"
      style={{
        background: "#fffd",
        color: "black",
        margin: ".25rem",
        padding: ".25rem",
        border: `2px solid ${success ? "palegreen" : "tomato"}`,
        borderRadius: "4px",
      }}
    >
      {title && <strong>{title}</strong>}
      <ul style={{ display: "contents", listStyle: "none" }}>
        {list.map(([key, value]) => (
          <li key={key} className="_pack-1" style={{ color: value ? "inherit" : "tomato" }}>
            <span className={value ? "i-ri:check-line" : "i-ri:close-line"} />
            {key}:{" "}
            {value === undefined ? (
              <span style={{ opacity: 0.5 }}>undefined</span>
            ) : typeof value === "boolean" && booleanLabels ? (
              booleanLabels[value ? "true" : "false"]
            ) : (
              String(value)
            )}
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}
