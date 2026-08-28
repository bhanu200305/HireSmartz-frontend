import { Select, Tabs } from 'antd';
import MasterPagination from '../shared/ui/MasterPagination';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { IoIosArrowForward } from 'react-icons/io';
import { useLocation, useNavigate } from 'react-router-dom';
import { LuSquareActivity } from 'react-icons/lu';
import MainLayout from '../../layouts/MainLayout';
import { FiArrowRightCircle } from 'react-icons/fi';
import { Button, Search } from '../shared';
import {
  ActivitySearchRequest,
  ActivitySearchResponse,
  FeedItem,
  useDashboardActivitySearchMutation,
} from '../../api/audit-service/Dashboard/ActivityStream';
import { Loader } from '../shared/ui/loader';
import { debounce } from 'lodash-es';
import {
  formattedDate,
  formattedTime,
  handleDateValue,
  mapStreamItemToFeedItem,
} from '../../shared/utils/methods';
import DateTimeRangePicker from '../shared/ui/datePicker';
import { DateTimePayload } from '../../types';
import useEventSource from '../../hooks/useEventSource';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { useActivityFilters } from '../../hooks/useActivityFilters';

type ActivityCardProps = {
  fullPage?: boolean;
};

const ActivityCard = ({ fullPage = false }: ActivityCardProps) => {
  const location = useLocation();
  const { filters, updateFilters } = useActivityFilters({
    size: fullPage ? 10 : 5,
  });
  const navigate = useNavigate();
  const [activitySearchData, setActivitySearchData] = useState<ActivitySearchResponse>({
    content: [],
    numberOfElements: 0,
    totalElements: 0,
    totalPages: 0,
  });
  const [streamItems, setStreamItems] = useState<FeedItem[]>([]);
  const restItems = activitySearchData?.content ?? [];
  const pageSize = 10;
  const numberOfElements = activitySearchData?.numberOfElements ?? 0;
  const totalRecords = activitySearchData?.totalElements ?? 0;
  const [activeTab, setActiveTab] = useState<string>('activity');
  const [activitySearch, { isLoading }] = useDashboardActivitySearchMutation();

  const activityDateFilters: DateTimePayload = {
    startDateTime: filters.fromDate,
    endDateTime: filters.toDate,
  };

  const fetchActivity = async () => {
    const payload: ActivitySearchRequest = {
      activityType: null,
      entityType: filters.entityType,
      text: filters.text,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      page: filters.page,
      size: fullPage ? filters.size : 5,
    };

    activitySearch(payload)
      .unwrap()
      .then((res: any) => {
        if (res) {
          setActivitySearchData(res);
        }
      })
      .catch((err) => {
        console.error('Activity search failed:', err);
      });
  };

  useEffect(() => {
    fetchActivity();
  }, [filters]);

  const tabItems = [
    {
      key: 'activity',
      label: <span className="text-[15px] heading-font">Activity</span>,
    },
    // {
    //   key: 'tasks',
    //   label: (
    //     <span className="text-[15px] heading-font"> Tasks <span className="text-primary"></span></span>
    //   )
    // }
  ];

  const handlePageChange = (page: number) => {
    updateFilters({ page: page - 1 });
  };

  const handleSearch = useMemo(
    () =>
      debounce((query: string) => {
        updateFilters({ text: query, page: 0 });
      }, 500),
    [updateFilters]
  );

  const handleChange = (type: string | null) => {
    updateFilters({ entityType: type, page: 0 });
  };

  const handleDateTimeChange = (range: DateTimePayload) => {
    updateFilters({
      fromDate: range.startDateTime,
      toDate: range.endDateTime,
      page: 0,
    });
  };

  const handleReset = () => {
    updateFilters({
      fromDate: '',
      toDate: '',
      page: 0,
    });
  };

  const handleItemClick = (item: any) => {
    if (item?.entityType === 'JOB') {
      if (!item?.jobOpeningId) return;

      navigate(`/jobs/view/${item.jobOpeningId}/candidates`);
    } else {
      if (!item?.jobOpeningId || !item?.candidateId) return;

      navigate(`/jobs/view/${item.jobOpeningId}/candidates/${item.candidateId}/details?tab=3`);
    }
  };

  const renderList = (data: FeedItem[]) => (
    <div className="mb-2 space-y-3">
      {data?.length > 0 ? (
        data.map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="flex items-center justify-between gap-4 px-4 py-1 bg-white 
             cursor-pointer hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                <HiOutlineDocumentText className="text-lg" />
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {item.title ? item.title : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-500">
                {formattedDate(item.createdAt)} {formattedTime(item.createdAt)}
              </p>

              {activeTab === 'activity' ? (
                <Button className="rounded-full p-2">
                  <FiArrowRightCircle className="text-xl text-primary" />
                </Button>
              ) : (
                <Button className="p-2 bg-brand-600 text-white text-sm font-medium">Act now</Button>
              )}
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">No recent activity found</p>
      )}
    </div>
  );

  const handleStreamMessage = useCallback(
    (eventData: any) => {
      if (!eventData) {
        return;
      }

      // Only process ACTIVITY events
      if (eventData.eventType && eventData.eventType !== 'ACTIVITY') {
        return;
      }

      const mappedItem = mapStreamItemToFeedItem(eventData);

      if (!mappedItem || !mappedItem.id) {
        return;
      }

      setStreamItems((prev) => {
        const exists = prev.some((item) => item.id === mappedItem.id);
        if (exists) {
          return prev;
        }
        return [mappedItem, ...prev];
      });
    },
    [mapStreamItemToFeedItem, setStreamItems]
  );

  useEventSource({
    type: 'candidate',
    restUrl: `/dashboard/activities/stream`,
    token: getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) ?? '',
    onMessage: handleStreamMessage,
  });

  const mergedActivityList = useMemo(() => {
    if (streamItems.length === 0) {
      return restItems;
    }

    const restIds = new Set(restItems.map((item) => item.id));

    const uniqueStreamItems = streamItems.filter((item) => !restIds.has(item.id));

    return [...uniqueStreamItems, ...restItems];
  }, [streamItems, restItems]);

  return (
    <div className="bg-gray-50 rounded-xl shadow px-8 py-4 w-full">
      {isLoading && <Loader />}
      <div className={`${fullPage ? 'w-full justify-start pt-16' : 'w-full justify-start'}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#000000]">
            <LuSquareActivity className="text-2xl text-white" />
          </div>
          <div className="flex flex-row flex-1 justify-between items-center">
            <h2 className="text-xl font-semibold">Activity Feed</h2>
          </div>
        </div>

        <div className="flex flex-row justify-between items-center">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="view-candidate-tabs"
          />

          <div className="flex flex-wrap items-center gap-2">
            <DateTimeRangePicker
              value={handleDateValue(activityDateFilters)}
              onApply={handleDateTimeChange}
              onReset={handleReset}
            />

            <div className="cfp-dropdown-trigger">
              <FilterSelectIcon />
              <Select
                allowClear
                options={[
                  { value: 'JOB', label: 'Job Opening' },
                  { value: 'CANDIDATE', label: 'Candidate' },
                ]}
                placeholder="Type"
                value={filters.entityType}
                onChange={handleChange}
                className="w-full custom-select"
                popupClassName="rounded-3xl"
                variant="borderless"
                style={{ width: 150, fontSize: 14 }}
              />
            </div>
            <div style={{ width: 350 }}>
              <Search
                appname="candidate"
                placeholder="Search Activity..."
                className="my-search"
                onSearch={handleSearch}
                allowClear
                value={filters.text}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-2">
        {activeTab === 'tasks' ? (
          <p className="text-sm text-gray-500 text-center py-4">No Tasks available</p>
        ) : (
          renderList(mergedActivityList)
        )}
      </div>

      <div className="mt-4">
        {fullPage && totalRecords > 0 ? (
          <MasterPagination
            current={filters.page + 1}
            pageSize={pageSize}
            total={totalRecords}
            itemLabel="Activity Feeds"
            onPageChange={(page) => handlePageChange(page)}
          />
        ) : (
          totalRecords > 0 && (
            <p className="text-sm text-gray-600">Showing latest {numberOfElements} record(s)</p>
          )
        )}

        {!fullPage && totalRecords > 0 && activeTab === 'activity' && (
          <button
            onClick={() => navigate(`/activityFeed${location.search}`)}
            className="ml-auto text-primary font-bold flex items-center underline cursor-pointer"
          >
            VIEW ALL ACTIVITIES <IoIosArrowForward />
          </button>
        )}
      </div>
    </div>
  );
};

const ActivityFeed = ({ fullPage = false }: { fullPage?: boolean }) => {
  if (fullPage) {
    return (
      <MainLayout>
        <ActivityCard fullPage={fullPage} />
      </MainLayout>
    );
  }
  return <ActivityCard fullPage={fullPage} />;
};

export default ActivityFeed;
