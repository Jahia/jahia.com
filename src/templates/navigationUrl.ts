/** Allow ordinary navigation links, never executable or local-file URL schemes. */
export const navigationUrl = (value?: string): string | undefined => {
  const url = value?.trim();
  if (
    !url ||
    [...url].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 || character === "\\";
    })
  )
    return undefined;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1].toLowerCase();
  return !scheme || ["https", "http", "mailto", "tel"].includes(scheme) ? url : undefined;
};
