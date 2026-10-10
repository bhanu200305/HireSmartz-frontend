const key = (text: string) => text.trim().toLowerCase();

/** True when `text` matches one of `others`, ignoring case and surrounding spaces. */
export const isRepeat = (text: string, others: string[]): boolean =>
  others.some((other) => key(other) === key(text));

/** Splits typed lines into new ones and repeats of `existing` or of an earlier line. */
export const splitRepeats = (lines: string[], existing: string[]) => {
  const seen = new Set(existing.map(key));
  const fresh: string[] = [];
  const repeats: string[] = [];
  for (const line of lines) {
    if (seen.has(key(line))) {
      repeats.push(line);
    } else {
      seen.add(key(line));
      fresh.push(line);
    }
  }
  return { fresh, repeats };
};
