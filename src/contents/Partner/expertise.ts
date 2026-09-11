const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Preserve the former plain-text list and rich editorial details during migration. */
export const legacyExpertiseBody = ({
  expertiseText,
  expertise = [],
  technologyDetails = "",
}: {
  expertiseText?: string;
  expertise?: string[];
  technologyDetails?: string;
}) => {
  const items = [
    ...new Set(
      [...(expertiseText || "").split(/\r?\n/), ...expertise]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  const list = items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  return [list, technologyDetails].filter(Boolean).join("\n");
};
