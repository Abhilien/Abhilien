/** Small text helpers shared by rule detail strings and the presentation layer. */

/** `1` -> `1st`, `2` -> `2nd`, `11` -> `11th`. */
export function ordinal(n: number): string {
  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (abs % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** Join a list the way a sentence would: `a`, `a and b`, `a, b and c`. */
export function listSentence(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Subject-verb agreement for a list of grahas. */
export function agrees(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
