export interface ActivityFilterState {
  text: string;
  entityType: string | null;
  fromDate: string;
  toDate: string;
  page: number;
  size: number;
}

export const parseActivitySearchParams = (
  searchParams: URLSearchParams
): Partial<ActivityFilterState> => {
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  return {
    text: searchParams.get('text') || '',
    entityType: searchParams.get('entityType'),
    fromDate: fromDate ? decodeURIComponent(fromDate) : '',
    toDate: toDate ? decodeURIComponent(toDate) : '',
    page: page ? Math.max(0, Number(page) - 1) : 0,
    size: size ? Number(size) : 10,
  };
};

export const updateActivitySearchParams = (
  params: URLSearchParams,
  filters: ActivityFilterState
) => {
  const newParams = new URLSearchParams(params);

  newParams.set('page', String(filters.page + 1));
  newParams.set('size', String(filters.size));

  filters.text ? newParams.set('text', filters.text) : newParams.delete('text');

  filters.entityType
    ? newParams.set('entityType', filters.entityType)
    : newParams.delete('entityType');

  filters.fromDate
    ? newParams.set('fromDate', encodeURIComponent(filters.fromDate))
    : newParams.delete('fromDate');

  filters.toDate
    ? newParams.set('toDate', encodeURIComponent(filters.toDate))
    : newParams.delete('toDate');

  return newParams;
};
