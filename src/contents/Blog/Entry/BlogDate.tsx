import { useTranslation } from "react-i18next";

export const getBlogDate = (date?: string, lastModified?: string, useLastModifiedDate = false) => {
  const published = Date.parse(date || "");
  const modified = Date.parse(lastModified || "");
  const updated = useLastModifiedDate && Number.isFinite(modified);
  return {
    date: updated ? lastModified : Number.isFinite(published) ? date : undefined,
    updated,
  };
};

export default function BlogDate({
  date,
  lastModified,
  useLastModifiedDate,
  locale,
}: {
  date?: string;
  lastModified?: string;
  useLastModifiedDate?: boolean;
  locale: string;
}) {
  const { t } = useTranslation();
  const displayed = getBlogDate(date, lastModified, useLastModifiedDate);
  if (!displayed.date) return null;

  return (
    <time dateTime={displayed.date}>
      {displayed.updated && `${t("blogListing.updatedOn")} `}
      {new Date(displayed.date).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
    </time>
  );
}
