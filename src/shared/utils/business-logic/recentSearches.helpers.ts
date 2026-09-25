export const RECENT_SEARCHES_STORAGE_KEY = 'cfp_recent_global_searches';
export const MAX_LOCAL_RECENT_SEARCHES = 10;
export const MIN_RECENT_SEARCH_LENGTH = 1;

const normalizeStorageScope = (scopeKey?: string): string =>
  scopeKey?.trim().toLowerCase().replace(/\s+/g, '_') || 'anonymous';

export const buildRecentSearchesStorageKey = (scopeKey?: string): string =>
  `${RECENT_SEARCHES_STORAGE_KEY}_${normalizeStorageScope(scopeKey)}`;

export type RecentSearchItem = {
  id: string;
  queryText: string;
};

type RecentSearchApiItem = {
  id?: string | number;
  queryText?: string;
};

export const sanitizeQuery = (queryText: string): string => queryText.trim();

const isValidQuery = (queryText: string): boolean =>
  sanitizeQuery(queryText).length >= MIN_RECENT_SEARCH_LENGTH;

const dedupeAndLimitRecentSearches = (items: RecentSearchItem[]): RecentSearchItem[] => {
  const seenQueries = new Set<string>();

  return items
    .filter((item) => {
      const normalizedQuery = sanitizeQuery(item.queryText).toLowerCase();
      if (!isValidQuery(item.queryText) || seenQueries.has(normalizedQuery)) return false;
      seenQueries.add(normalizedQuery);
      return true;
    })
    .slice(0, MAX_LOCAL_RECENT_SEARCHES);
};

export const getStoredRecentSearches = (scopeKey?: string): RecentSearchItem[] => {
  try {
    const rawValue = localStorage.getItem(buildRecentSearchesStorageKey(scopeKey));
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) return [];

    const normalizedItems = parsedValue
      .filter(
        (item): item is RecentSearchApiItem =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as RecentSearchApiItem).queryText === 'string'
      )
      .map((item, index) => ({
        id: String(item.id ?? `local-${index}`),
        queryText: sanitizeQuery(item.queryText as string),
      }));

    return dedupeAndLimitRecentSearches(normalizedItems);
  } catch {
    return [];
  }
};

export const saveRecentSearches = (items: RecentSearchItem[], scopeKey?: string): void => {
  const sanitizedItems = dedupeAndLimitRecentSearches(items);

  try {
    localStorage.setItem(buildRecentSearchesStorageKey(scopeKey), JSON.stringify(sanitizedItems));
  } catch (error) {
    console.error('Failed to save recent searches to localStorage:', error);
  }
};

export const upsertRecentSearch = (
  prevItems: RecentSearchItem[],
  queryText: string
): RecentSearchItem[] => {
  const sanitizedQuery = sanitizeQuery(queryText);
  if (!isValidQuery(sanitizedQuery)) return dedupeAndLimitRecentSearches(prevItems);

  const dedupedItems = prevItems.filter(
    (item) => item.queryText.toLowerCase() !== sanitizedQuery.toLowerCase()
  );

  return dedupeAndLimitRecentSearches([
    { id: `local-${Date.now()}`, queryText: sanitizedQuery },
    ...dedupedItems,
  ]);
};

// "Remove" for a recent-search chip — there is no backend DELETE for a
// single recent-search row yet (only GET .../search/recent, which always
// returns the server's own last-N list), so an item removed here would
// otherwise just reappear the next time that list is refetched. Persisting
// the dismissal locally, per scope, and filtering it out of whatever the
// server/localStorage returns is what makes "remove" actually stick across
// reloads until that backend endpoint exists.
const buildDismissedRecentSearchesStorageKey = (scopeKey?: string): string =>
  `${RECENT_SEARCHES_STORAGE_KEY}_dismissed_${normalizeStorageScope(scopeKey)}`;

export const getDismissedRecentSearchQueries = (scopeKey?: string): Set<string> => {
  try {
    const rawValue = localStorage.getItem(buildDismissedRecentSearchesStorageKey(scopeKey));
    if (!rawValue) return new Set();

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) return new Set();

    return new Set(parsedValue.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set();
  }
};

const saveDismissedRecentSearchQueries = (
  scopeKey: string | undefined,
  dismissed: Set<string>
): void => {
  try {
    localStorage.setItem(
      buildDismissedRecentSearchesStorageKey(scopeKey),
      JSON.stringify(Array.from(dismissed))
    );
  } catch (error) {
    console.error('Failed to save dismissed recent searches to localStorage:', error);
  }
};

export const dismissRecentSearch = (
  scopeKey: string | undefined,
  queryText: string
): Set<string> => {
  const dismissed = getDismissedRecentSearchQueries(scopeKey);
  dismissed.add(sanitizeQuery(queryText).toLowerCase());
  saveDismissedRecentSearchQueries(scopeKey, dismissed);
  return dismissed;
};

// Called when the user performs a genuine new search for a term they'd
// previously dismissed as a suggestion chip — that's a fresh, deliberate
// use of the term, not the old stale chip, so it should be allowed to
// reappear as a recent search rather than staying permanently hidden.
export const undismissRecentSearch = (
  scopeKey: string | undefined,
  queryText: string
): Set<string> => {
  const dismissed = getDismissedRecentSearchQueries(scopeKey);
  dismissed.delete(sanitizeQuery(queryText).toLowerCase());
  saveDismissedRecentSearchQueries(scopeKey, dismissed);
  return dismissed;
};

export const filterDismissedRecentSearches = (
  items: RecentSearchItem[],
  dismissed: Set<string>
): RecentSearchItem[] =>
  items.filter((item) => !dismissed.has(sanitizeQuery(item.queryText).toLowerCase()));

export const mergeRecentSearches = (
  primaryItems: RecentSearchItem[],
  secondaryItems: RecentSearchItem[]
): RecentSearchItem[] => dedupeAndLimitRecentSearches([...primaryItems, ...secondaryItems]);

export const normalizeRecentSearchesFromApi = (response: unknown): RecentSearchItem[] => {
  const sourceItems = Array.isArray(response)
    ? response
    : response &&
        typeof response === 'object' &&
        Array.isArray((response as { data?: unknown }).data)
      ? ((response as { data: unknown[] }).data as unknown[])
      : [];

  const normalizedItems = sourceItems
    .filter(
      (item): item is RecentSearchApiItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as RecentSearchApiItem).queryText === 'string'
    )
    .map((item, index) => ({
      id: String(item.id ?? `api-${index}`),
      queryText: sanitizeQuery(item.queryText as string),
    }));

  return dedupeAndLimitRecentSearches(normalizedItems);
};
