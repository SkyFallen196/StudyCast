/** SearchService: поиск подстроки без учёта регистра, «ё» и «е» считаются одной буквой (FE-026). */

export function normalize(text: string): string {
  return text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
}

export interface TextMatch {
  /** Индекс фразы в транскрипте. */
  segment: number;
  start: number;
  end: number;
}

/** Все вхождения запроса в списке фраз. Нормализация не меняет длину строки, поэтому индексы совпадают с исходным текстом. */
export function findMatches(texts: string[], query: string): TextMatch[] {
  const needle = normalize(query.trim());
  if (!needle) return [];
  const matches: TextMatch[] = [];
  texts.forEach((text, segment) => {
    const haystack = normalize(text);
    let from = haystack.indexOf(needle);
    while (from !== -1) {
      matches.push({ segment, start: from, end: from + needle.length });
      from = haystack.indexOf(needle, from + needle.length);
    }
  });
  return matches;
}

export function includesText(text: string, query: string): boolean {
  const needle = normalize(query.trim());
  return needle !== '' && normalize(text).includes(needle);
}
