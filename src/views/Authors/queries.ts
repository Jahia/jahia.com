export const sqlLiteral = (value: string) => "'" + value.replaceAll("'", "''") + "'";
export const directoryQuery = (folder: string, exclude?: string) =>
  `SELECT * FROM [jahiacom:blogAuthor] AS n WHERE ISDESCENDANTNODE(n, ${sqlLiteral(folder)}) AND (n.[showInDirectory] IS NULL OR n.[showInDirectory] = true) ${exclude ? `AND n.[jcr:uuid] <> ${sqlLiteral(exclude)}` : ""} ORDER BY n.[name] ASC, n.[jcr:uuid] ASC`;
export const publicationQuery = (site: string, author: string) =>
  `SELECT * FROM [jahiacom:blogEntry] AS n WHERE ISDESCENDANTNODE(n, ${sqlLiteral(site)}) AND n.[author] = ${sqlLiteral(author)} ORDER BY n.[date] DESC, n.[jcr:uuid] ASC`;
export const directoryPageNumber = (value: string | null | undefined) =>
  value && /^\d{1,3}$/.test(value) ? Number(value) : 0;
