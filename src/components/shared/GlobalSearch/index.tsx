import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { List, Tag, Divider, Avatar, Empty } from 'antd';
import { UserOutlined, SolutionOutlined, ShopOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { formatPhoneNumber } from '../../../shared/utils/methods';
import { useDebouncedEffect } from '../../../hooks/useDebouncedEffect';
import { useDebouncedQuery } from '../../../hooks/useDebouncedQuery';
import {
  buildRecentSearchesStorageKey,
  getStoredRecentSearches,
  normalizeRecentSearchesFromApi,
  saveRecentSearches,
  upsertRecentSearch,
  type RecentSearchItem,
} from '../../../shared/utils/business-logic/recentSearches.helpers';
import {
  useGetRecentSearchesQuery,
  useGlobalSearchQuery,
} from '../../../api/search-service/Dashboard/GlobalSearch';
import { RootState } from '../../../redux/provider/store';

const SEARCH_RESULT_WIDTH = 700;
const SEARCH_RESULT_MAX_HEIGHT = 700;
const GLOBAL_SEARCH_ITEMS_PER_SECTION = 3;
const RECENT_SEARCH_SAVE_DEBOUNCE_MS = 1200;

export type SearchResult = {
  id?: string | number;
  docId?: string;
  sourceType: 'JOB' | 'CANDIDATE' | 'USER' | 'COMPANY';
  title: string;
  queryText?: string;
  extraJson?: Record<string, any>;
};

type SourceTypeCount = {
  sourceType: string;
  count: number;
};

interface SearchSection {
  key: string;
  title: string;
  items: SearchResult[];
  sourceType?: string;
  show: boolean;
  withBottomBorder: boolean;
  onViewAll: () => void;
  renderItem: (item: SearchResult) => React.ReactNode;
}

interface ResultSectionProps {
  title: string;
  items?: SearchResult[];
  show: boolean;
  sourceType?: string;
  sourceTypeCounts?: SourceTypeCount[];
  onViewAll: () => void;
  renderItem: (item: SearchResult) => React.ReactNode;
  withBottomBorder?: boolean;
}

interface SearchNavigationConfig {
  candidatesViewAllPath: string;
  jobsViewAllPath: string;
  usersViewAllPath: string;
  companiesViewAllPath: string;
  getCandidateDetailPath: (item: SearchResult) => string;
  getJobDetailPath: (item: SearchResult) => string;
  getUserDetailPath: (item: SearchResult) => string;
  getCompanyDetailPath: (item: SearchResult) => string;
}

interface GlobalSearchProps {
  query: {
    query: string;
    category?: string;
    field?: string;
  };
  onQueryChange: (value: string) => void;
  onClose: (clearSearch?: boolean) => void;
  isInputFocused: boolean;
  onSearchTrigger?: (query: string) => void;
  navigationConfig?: Partial<SearchNavigationConfig>;
}

// A USER result's `extraJson.userType` says which of three things it is
// (see org-service's `GlobalSearchUseCase._to_result_item`):
//   - "COMPANY": a real, accepted `users` row — has its own detail page.
//   - "CFP": CareerForce Pro's own internal staff, merged in for a platform
//     (SuperAdmin) search — no single-record detail page anywhere in the
//     app, only the listing at `/organisation-users`.
//   - "COMPANY_PENDING": someone a tenant has invited who has not yet
//     accepted — there is NO `users` row for them yet at all (org-service
//     only creates one on invite acceptance), so `extraJson.id` here is the
//     INVITE's own id, not a user id. Same as CFP staff, this has no
//     per-record detail page, so it also routes to the listing page instead
//     of a dead `/view-organisation-user?orgUserId=<invite id>` link.
export const isCfpStaffResult = (item: SearchResult): boolean =>
  item?.extraJson?.userType === 'CFP';
export const isPendingInviteResult = (item: SearchResult): boolean =>
  item?.extraJson?.userType === 'COMPANY_PENDING';

// The TENANT-caller default: a company admin's own team, always their own
// tenant, never someone else's — a platform (SuperAdmin) caller needs a
// DIFFERENT destination for the same userType (see Header.tsx's own
// `globalSearchNavigationConfig.getUserDetailPath`, which composes this as
// its own fallback rather than duplicating the CFP/pending branching here).
export const getDefaultUserDetailPath = (item: SearchResult): string =>
  isCfpStaffResult(item) || isPendingInviteResult(item)
    ? '/organisation-users'
    : `/view-organisation-user?orgUserId=${item?.extraJson?.id}`;

const defaultNavigationConfig: SearchNavigationConfig = {
  candidatesViewAllPath: '/candidates',
  jobsViewAllPath: '/jobs',
  usersViewAllPath: '/organisation-users',
  companiesViewAllPath: '/company',
  getCandidateDetailPath: (item) =>
    `/jobs/view/${item?.extraJson?.job_opening_id}/candidates/${item?.extraJson?.id}/details`,
  getJobDetailPath: (item) => `/jobs/view/${item?.extraJson?.id}/candidates`,
  getUserDetailPath: getDefaultUserDetailPath,
  getCompanyDetailPath: (item) => `/view-company?companyId=${item?.extraJson?.id}`,
};

const ResultSection: React.FC<ResultSectionProps> = ({
  title,
  items = [],
  show,
  sourceType,
  sourceTypeCounts = [],
  onViewAll,
  renderItem,
  withBottomBorder = false,
}) => {
  if (!show) return null;

  const getCount = useCallback((): number => {
    if (sourceType && sourceTypeCounts.length > 0) {
      const countObj = sourceTypeCounts.find((c) => c.sourceType === sourceType);
      return countObj?.count || items.length || 0;
    }
    return items.length || 0;
  }, [sourceType, sourceTypeCounts, items.length]);

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{title}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#6b7280',
              backgroundColor: '#f3f4f6',
              borderRadius: 999,
              padding: '1px 8px',
              lineHeight: '18px',
            }}
          >
            {getCount()}
          </span>
        </div>
        <button
          className="text-primary font-semibold relative cursor-pointer transition-colors"
          style={{ fontSize: 12.5, letterSpacing: 0.2 }}
          onMouseDown={(e) => {
            e.preventDefault();
            onViewAll();
          }}
        >
          VIEW ALL
          <span className="no-underline ml-1 text-orange-500">→</span>
        </button>
      </div>

      <List
        style={{ marginTop: 10 }}
        dataSource={items}
        split={false}
        renderItem={(item) => (
          <div
            key={item.docId || item.id}
            className="group"
            style={{
              padding: '10px 12px',
              margin: '0 -12px 4px',
              borderRadius: 10,
              cursor: 'default',
              transition: 'background-color 0.15s ease',
              borderBottom: withBottomBorder ? undefined : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {renderItem(item)}
          </div>
        )}
      />
    </div>
  );
};

const CandidateResultItem: React.FC<{
  item: SearchResult;
  onClose: (clearSearch?: boolean) => void;
  getCandidateDetailPath: (item: SearchResult) => string;
}> = ({ item, onClose, getCandidateDetailPath }) => (
  <div style={{ display: 'flex', gap: 10 }}>
    <Avatar
      size={32}
      style={{ backgroundColor: 'var(--primary)', pointerEvents: 'none', flexShrink: 0 }}
      icon={<UserOutlined />}
    />
    <div style={{ pointerEvents: 'none', flex: 1 }}>
      <Link
        to={getCandidateDetailPath(item)}
        className="font-semibold text-primary hover:text-primary hover:underline roboto-font inline-block cursor-pointer"
        style={{ pointerEvents: 'auto' }}
        onClick={() => onClose(false)}
      >
        <p className="font-semibold text-primary roboto-font" style={{ margin: 0 }}>
          {item.title}
        </p>
      </Link>
      <InfoRow label="Job Title:" value={(item?.extraJson?.job_title as string) || 'N/A'} />
      <InfoRow label="Email:" value={(item?.extraJson?.email as string) || 'N/A'} />
      <InfoRow
        label="Phone Number:"
        value={`${(item?.extraJson?.country_code as string) || ''}${formatPhoneNumber(item?.extraJson?.phone_number as string) || 'N/A'}`}
      />
    </div>
  </div>
);

const JobResultItem: React.FC<{
  item: SearchResult;
  onClose: (clearSearch?: boolean) => void;
  getJobDetailPath: (item: SearchResult) => string;
}> = ({ item, onClose, getJobDetailPath }) => (
  <div style={{ display: 'flex', gap: 10 }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: '#eff6ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        pointerEvents: 'none',
      }}
    >
      <SolutionOutlined style={{ fontSize: 16, color: '#2563eb' }} />
    </div>
    <div style={{ pointerEvents: 'none', flex: 1 }}>
      <Link
        to={getJobDetailPath(item)}
        className="font-semibold text-primary hover:text-primary hover:underline roboto-font inline-block cursor-pointer"
        style={{ pointerEvents: 'auto' }}
        onClick={() => onClose(false)}
      >
        <p className="font-semibold text-primary roboto-font" style={{ margin: 0 }}>
          {(item?.extraJson?.job_title_name as string) || 'N/A'}
        </p>
      </Link>
      <InfoRow label="Department:" value={(item?.extraJson?.department_name as string) || 'N/A'} />
      <InfoRow label="Job Type:" value={(item?.extraJson?.job_type_name as string) || 'N/A'} />
    </div>
  </div>
);

const UserResultItem: React.FC<{
  item: SearchResult;
  onClose: (clearSearch?: boolean) => void;
  getUserDetailPath: (item: SearchResult) => string;
}> = ({ item, onClose, getUserDetailPath }) => {
  const isCfpStaff = isCfpStaffResult(item);
  const isPendingInvite = isPendingInviteResult(item);
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <Avatar
        size={32}
        style={{
          backgroundColor: isCfpStaff ? '#7c3aed' : isPendingInvite ? '#d97706' : 'var(--primary)',
          pointerEvents: 'none',
          flexShrink: 0,
        }}
        icon={<UserOutlined />}
      />
      <div style={{ pointerEvents: 'none', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link
            to={getUserDetailPath(item)}
            className="font-semibold text-primary hover:text-primary roboto-font inline-block cursor-pointer"
            style={{ pointerEvents: 'auto' }}
            onClick={() => onClose(false)}
          >
            <p className="font-semibold text-primary roboto-font" style={{ margin: 0 }}>
              {item.title}
            </p>
          </Link>
          {isCfpStaff && (
            <Tag
              color="purple"
              style={{
                margin: 0,
                fontSize: 10,
                lineHeight: '16px',
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              CFP Staff
            </Tag>
          )}
          {isPendingInvite && (
            <Tag
              color="orange"
              style={{
                margin: 0,
                fontSize: 10,
                lineHeight: '16px',
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              Pending
            </Tag>
          )}
        </div>
        <InfoRow label="Email:" value={(item?.extraJson?.email_id as string) || 'N/A'} />
        <InfoRow
          label="Phone Number:"
          value={`${(item?.extraJson?.country_code as string) || ''}${formatPhoneNumber(item?.extraJson?.phone_number as string) || 'N/A'}`}
        />
      </div>
    </div>
  );
};

const CompanyResultItem: React.FC<{
  item: SearchResult;
  onClose: (clearSearch?: boolean) => void;
  getCompanyDetailPath: (item: SearchResult) => string;
}> = ({ item, onClose, getCompanyDetailPath }) => (
  <div style={{ display: 'flex', gap: 10 }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: '#eff6ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        pointerEvents: 'none',
      }}
    >
      <ShopOutlined style={{ fontSize: 16, color: '#2563eb' }} />
    </div>
    <div style={{ pointerEvents: 'none', flex: 1 }}>
      <Link
        to={getCompanyDetailPath(item)}
        className="font-semibold text-primary hover:text-primary hover:underline roboto-font inline-block cursor-pointer"
        style={{ pointerEvents: 'auto' }}
        onClick={() => onClose(false)}
      >
        <p className="font-semibold text-primary roboto-font" style={{ margin: 0 }}>
          {item.title}
        </p>
      </Link>
      <InfoRow label="Website Link:" value={(item?.extraJson?.website_url as string) || 'N/A'} />
      <InfoRow label="Address:" value={(item?.extraJson?.address_line1 as string) || 'N/A'} />
    </div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ pointerEvents: 'none', cursor: 'default' }}>
    <p
      className="inline-flex items-center gap-1 max-w-full roboto-font"
      style={{ margin: '2px 0 0' }}
    >
      <span className="font-medium whitespace-nowrap" style={{ color: '#6b7280', fontSize: 12 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>
    </p>
  </div>
);

export default function GlobalSearch({
  query,
  onQueryChange,
  onClose,
  isInputFocused,
  onSearchTrigger,
  navigationConfig,
}: GlobalSearchProps): React.ReactElement {
  const navigate = useNavigate();
  const currentUserId = useSelector((state: RootState) => state.LoginSlice.userId);
  const currentRoleName = useSelector((state: RootState) => state.LoginSlice.role?.name);
  const currentRoleType = useSelector((state: RootState) => state.LoginSlice.role?.type);

  const searchScopeKey = useMemo(
    () =>
      [currentUserId || 'anonymous', currentRoleType || 'unknown', currentRoleName || 'unknown']
        .map((value) => String(value).trim())
        .join('::'),
    [currentRoleName, currentRoleType, currentUserId]
  );

  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() =>
    getStoredRecentSearches(searchScopeKey)
  );
  const [pendingRecentQuery, setPendingRecentQuery] = useState<string>('');

  const routes = useMemo(
    () => ({
      ...defaultNavigationConfig,
      ...(navigationConfig || {}),
    }),
    [navigationConfig]
  );

  const { data: searchRes, isLoading: isSearchLoading } = useDebouncedQuery({
    options: {
      q: query.query.trim(),
      category: query.category,
      field: query.field,
      scopeKey: searchScopeKey,
    },
    state: {},
    delay: 500,
    skip: !query.query.trim(),
    rtkQueryHook: useGlobalSearchQuery,
    dependencyArrayKeys: ['options_q', 'options_category', 'options_field', 'options_scopeKey'],
  });

  const { data: recentRes, refetch: refetchRecentSearches } = useGetRecentSearchesQuery(
    buildRecentSearchesStorageKey(searchScopeKey),
    {
      refetchOnMountOrArgChange: true,
    }
  );

  useEffect(() => {
    setPendingRecentQuery('');
    setRecentSearches(getStoredRecentSearches(searchScopeKey));
    void refetchRecentSearches();
  }, [refetchRecentSearches, searchScopeKey]);

  useEffect(() => {
    if (searchRes !== undefined) {
      const currentQuery = query.query.trim();
      if (currentQuery) {
        setPendingRecentQuery(currentQuery);
        void refetchRecentSearches();
      }
    }
  }, [searchRes, query.query, refetchRecentSearches]);

  useDebouncedEffect(
    () => {
      if (!pendingRecentQuery) return;

      setRecentSearches((previousSearches) => {
        const updatedSearches = upsertRecentSearch(previousSearches, pendingRecentQuery);
        saveRecentSearches(updatedSearches, searchScopeKey);
        return updatedSearches;
      });
    },
    [pendingRecentQuery, searchScopeKey],
    RECENT_SEARCH_SAVE_DEBOUNCE_MS
  );

  useEffect(() => {
    if (recentRes === undefined) return;

    const normalizedRecentSearches = normalizeRecentSearchesFromApi(recentRes as unknown);

    setRecentSearches(() => {
      saveRecentSearches(normalizedRecentSearches, searchScopeKey);
      return normalizedRecentSearches;
    });
  }, [recentRes, searchScopeKey]);

  const { results, sourceTypeCounts } = useMemo(
    () => ({
      results: query.query?.trim() ? ((searchRes?.results as SearchResult[]) ?? []) : [],
      sourceTypeCounts: query.query?.trim()
        ? ((searchRes?.sourceTypeCounts as SourceTypeCount[]) ?? [])
        : [],
    }),
    [query.query, searchRes]
  );

  const { jobsFromApi, candidatesFromApi, usersFromApi, companiesFromApi } = useMemo(
    () => ({
      jobsFromApi: results.filter((r) => r.sourceType === 'JOB'),
      candidatesFromApi: results.filter((r) => r.sourceType === 'CANDIDATE'),
      usersFromApi: results.filter((r) => r.sourceType === 'USER'),
      companiesFromApi: results.filter((r) => r.sourceType === 'COMPANY'),
    }),
    [results]
  );

  const handleViewAll = useCallback(
    (path: string, searchQuery: string, sourceType?: string, items?: SearchResult[]) => {
      const targetPath = path.startsWith('/') ? path : `/${path}`;
      const state: Record<string, unknown> = {
        fromGlobalSearch: true,
        searchQuery,
        searchField: query.field || '',
        resetFilters: true,
      };

      if (targetPath === '/candidates' && sourceType === 'CANDIDATE' && items?.length) {
        state.candidatesData = items;
      }

      navigate(targetPath, { state });

      if (typeof onClose === 'function') {
        onClose(false);
      }
    },
    [navigate, onClose]
  );

  const handleRecentSearchClick = useCallback(
    (queryText: string) => {
      setRecentSearches((previousSearches) => {
        const updatedSearches = upsertRecentSearch(previousSearches, queryText);
        saveRecentSearches(updatedSearches, searchScopeKey);
        return updatedSearches;
      });

      onQueryChange(queryText);
      onSearchTrigger?.(queryText);
    },
    [onQueryChange, onSearchTrigger, searchScopeKey]
  );

  const sections: SearchSection[] = useMemo(
    () => [
      {
        key: 'candidates',
        title: 'Candidates',
        items: candidatesFromApi.slice(0, GLOBAL_SEARCH_ITEMS_PER_SECTION),
        sourceType: 'CANDIDATE',
        show:
          sourceTypeCounts.some((c) => c.sourceType === 'CANDIDATE') ||
          candidatesFromApi.length > 0,
        withBottomBorder: false,
        onViewAll: () =>
          handleViewAll(routes.candidatesViewAllPath, query.query, 'CANDIDATE', candidatesFromApi),
        renderItem: (item) => (
          <CandidateResultItem
            item={item}
            onClose={onClose}
            getCandidateDetailPath={routes.getCandidateDetailPath}
          />
        ),
      },
      {
        key: 'jobs',
        title: 'Job Openings',
        items: jobsFromApi.slice(0, GLOBAL_SEARCH_ITEMS_PER_SECTION),
        sourceType: 'JOB',
        show: sourceTypeCounts.some((c) => c.sourceType === 'JOB') || jobsFromApi.length > 0,
        withBottomBorder: true,
        onViewAll: () => handleViewAll(routes.jobsViewAllPath, query.query, 'JOB', jobsFromApi),
        renderItem: (item) => (
          <JobResultItem item={item} onClose={onClose} getJobDetailPath={routes.getJobDetailPath} />
        ),
      },
      {
        key: 'users',
        title: 'Users',
        items: usersFromApi.slice(0, GLOBAL_SEARCH_ITEMS_PER_SECTION),
        show: sourceTypeCounts.some((c) => c.sourceType === 'USER') || usersFromApi.length > 0,
        withBottomBorder: true,
        onViewAll: () => handleViewAll(routes.usersViewAllPath, query.query, 'USER', usersFromApi),
        renderItem: (item) => (
          <UserResultItem
            item={item}
            onClose={onClose}
            getUserDetailPath={routes.getUserDetailPath}
          />
        ),
      },
      {
        key: 'companies',
        title: 'Companies',
        items: companiesFromApi.slice(0, GLOBAL_SEARCH_ITEMS_PER_SECTION),
        sourceType: 'COMPANY',
        show:
          sourceTypeCounts.some((c) => c.sourceType === 'COMPANY') || companiesFromApi.length > 0,
        withBottomBorder: true,
        onViewAll: () =>
          handleViewAll(routes.companiesViewAllPath, query.query, 'COMPANY', companiesFromApi),
        renderItem: (item) => (
          <CompanyResultItem
            item={item}
            onClose={onClose}
            getCompanyDetailPath={routes.getCompanyDetailPath}
          />
        ),
      },
    ],
    [
      candidatesFromApi,
      jobsFromApi,
      usersFromApi,
      companiesFromApi,
      sourceTypeCounts,
      query.query,
      handleViewAll,
      onClose,
      routes,
    ]
  );

  const hasResults = sections.some((section) => section.show);
  const showSearchInput = (!query.query || query.query.trim() === '') && isInputFocused;
  const showResults = query.query && query.query.trim() !== '';

  return (
    <div
      style={{
        // No `position`/`right` here — this panel is already the sole
        // child of antd's OWN Dropdown popup wrapper (see Header/index.tsx's
        // `dropdownRender`), which handles anchoring it under the search
        // box itself. Adding a SECOND `position: absolute` on top of that
        // detached this box from antd's positioning and let it render
        // anywhere from `right: 0` up the ancestor chain — which is why
        // the panel could end up positioned so far down the page that its
        // own `overflow: auto` never had a visible scrollbar to grab: the
        // box's height was capped correctly, but the box itself could sit
        // partly below the browser's own viewport, with nothing above this
        // component able to scroll it back into view.
        //
        // The real fix is capping height against the VIEWPORT, not just a
        // flat 700px: `calc(100vh - 96px)` leaves room for the navbar this
        // panel drops from, so the panel's own content area is always
        // fully reachable by scrolling inside it, regardless of screen
        // size or how many results come back.
        padding: '20px 22px',
        maxHeight: `min(${SEARCH_RESULT_MAX_HEIGHT}px, calc(100vh - 96px))`,
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#fff',
        borderRadius: 14,
        width: SEARCH_RESULT_WIDTH,
        maxWidth: '92vw',
      }}
    >
      {(showSearchInput || showResults) && (
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Try searching for</span>
          {Array.isArray(recentSearches) &&
            recentSearches.map((item) => (
              <Tag
                key={String(item.id ?? item.queryText)}
                style={{
                  cursor: 'pointer',
                  margin: 0,
                  borderRadius: 999,
                  padding: '2px 12px',
                  backgroundColor: '#f8f9fb',
                  color: '#374151',
                  border: '1px solid #edeef2',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
                onMouseDown={(e: React.MouseEvent) => {
                  e.preventDefault();
                  handleRecentSearchClick(item.queryText as string);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#eef2ff';
                  e.currentTarget.style.borderColor = '#c7d2fe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fb';
                  e.currentTarget.style.borderColor = '#edeef2';
                }}
              >
                {item.queryText}
              </Tag>
            ))}
        </div>
      )}

      {isSearchLoading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280', fontSize: 13 }}>
          Searching…
        </div>
      ) : !hasResults ? (
        <Empty
          style={{ padding: '24px 0' }}
          description={
            <span style={{ color: '#9ca3af', fontSize: 13 }}>
              {query.query ? 'No results found' : 'Start typing to search'}
              {query.category && ` in ${query.category}`}
            </span>
          }
        />
      ) : (
        <>
          {sections.map((section, index) => (
            <React.Fragment key={section.key}>
              <ResultSection
                title={section.title}
                items={section.items}
                show={section.show}
                sourceType={section.sourceType}
                sourceTypeCounts={sourceTypeCounts}
                onViewAll={section.onViewAll}
                renderItem={section.renderItem}
                withBottomBorder={section.withBottomBorder}
              />
              {section.show && sections.slice(index + 1).some((s) => s.show) && (
                <Divider style={{ margin: '4px 0 16px', borderColor: '#f0f1f4' }} />
              )}
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
}
