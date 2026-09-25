export interface GlossaryItem {
  id: string;
  title: string;
  summary: string;
  aliases: string[];
  url: string;
}

export const normalizeTerm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const termLetter = (title: string) => {
  const initial = normalizeTerm(title).charAt(0).toUpperCase();
  return /^[A-Z]$/.test(initial) ? initial : "#";
};

export const filterTerms = (entries: GlossaryItem[], query: string) => {
  const words = normalizeTerm(query).split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    const text = normalizeTerm([entry.title, entry.summary, ...entry.aliases].join(" "));
    return words.every((word) => text.includes(word));
  });
};

export const groupTerms = (entries: GlossaryItem[]) => {
  const groups = new Map<string, GlossaryItem[]>();
  for (const entry of [...entries].sort((a, b) => {
    const left = normalizeTerm(a.title);
    const right = normalizeTerm(b.title);
    return left < right ? -1 : left > right ? 1 : 0;
  })) {
    const letter = termLetter(entry.title);
    groups.set(letter, [...(groups.get(letter) || []), entry]);
  }
  return [...groups.entries()];
};
