import { SortDirection } from '../../../types';

export interface FilterState {
  internalStatus: string | null;
  source: string | null;
  externalStatus: string | null;
  searchQuery: string;
  page: number;
  size: number;
  sortBy: string | undefined;
  sortDir: SortDirection | undefined;
  roundType?: string;
  isNew?: boolean;
}

export const parseSearchParams = (searchParams: URLSearchParams): Partial<FilterState> => {
  const pageParam = searchParams.get('page');
  const sizeParam = searchParams.get('size');
  const internalStatusParam = searchParams.get('internalStatus');
  const isNewParam = searchParams.get('isNew');
  const parsedIsNew = isNewParam === 'true' ? true : isNewParam === 'false' ? false : undefined;

  const decodedSearchQuery = searchParams.get('searchQuery') || '';

  return {
    internalStatus: internalStatusParam || null,
    source: searchParams.get('source') || null,
    externalStatus: parsedIsNew ? null : searchParams.get('externalStatus') || 'ACTIVE',
    roundType: searchParams.get('roundType') || undefined,
    isNew: parsedIsNew,
    searchQuery: decodedSearchQuery || '',
    page: pageParam ? Math.max(0, parseInt(pageParam, 10) - 1) : 0,
    size: sizeParam ? parseInt(sizeParam, 10) : 10,
    sortBy: searchParams.get('sortBy') || undefined,
    sortDir: (searchParams.get('sortDir') as SortDirection) || undefined,
  };
};

export const updateSearchParams = (
  params: URLSearchParams,
  filters: FilterState
): URLSearchParams => {
  const newParams = new URLSearchParams(params);

  newParams.set('page', (filters.page + 1).toString());
  newParams.set('size', filters.size.toString());

  if (filters.internalStatus) newParams.set('internalStatus', filters.internalStatus);
  else newParams.delete('internalStatus');

  if (filters.source) newParams.set('source', filters.source);
  else newParams.delete('source');

  if (filters.externalStatus && !filters.isNew)
    newParams.set('externalStatus', filters.externalStatus);
  else newParams.delete('externalStatus');

  if (filters.roundType) newParams.set('roundType', filters.roundType);
  else newParams.delete('roundType');

  if (filters.isNew !== undefined) newParams.set('isNew', String(filters.isNew));
  else newParams.delete('isNew');

  if (filters.searchQuery) newParams.set('searchQuery', filters.searchQuery);
  else newParams.delete('searchQuery');

  if (filters.sortBy) newParams.set('sortBy', filters.sortBy);
  else newParams.delete('sortBy');

  if (filters.sortDir) newParams.set('sortDir', filters.sortDir);
  else newParams.delete('sortDir');

  return newParams;
};

export const getCurrentSortKey = (sortBy?: string, sortDir?: SortDirection): string | undefined => {
  return sortBy && sortDir ? `${sortDir === 'desc' ? '-' : ''}${sortBy}` : undefined;
};
