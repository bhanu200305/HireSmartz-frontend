import { useEffect, useState } from 'react';
import { Button, Search, CommonCard, showToast } from '..';
import { Col, Dropdown, Row, Select } from 'antd';
import { DownOutlined, MoreOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import MasterPagination from '../shared/ui/MasterPagination';
import MainLayout from '../../layouts/MainLayout';
import { LuUsersRound } from 'react-icons/lu';
import './userpage.css';
import { MdOutlineCopyAll, MdOutlineFilterAlt } from 'react-icons/md';
import { DateTimePayload, SortDirection, User } from '../../types';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import { useGetUsersQuery } from '../../api/tenant-service/User/getUser';
import { setFilters } from '../../redux/slices/userFilterSlice';
import { Loader } from '../shared/ui/loader';
import { useArchiveUserMutation } from '../../api/tenant-service/User/archiveUser';
import DateTimeRangePicker from '../shared/ui/datePicker';
import { formatPhoneNumber, handleDateValue } from '../../shared/utils/methods';
import { handleArchive, handleResendInvite } from '../../shared/utils/business-logic';
import { COL } from '../shared/ui/Columns';
import { hasFeatureAccess } from '../../shared/utils/auth/getAccess';

import { useResendInviteMutation } from '../../api/tenant-service/User/reinviteUser';
import renderHighlightedField from '../shared/ui/RenderHighlightedField';
import { buildInternalGlobalSearchRequestDto } from '../../shared/utils/filters/internalSearchPayload';

const { Option } = Select;

const UserTable = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Get location to access state
  const dispatch = useDispatch();
  const [archiveUser, { isLoading: isArchiving }] = useArchiveUserMutation();
  const [resendInviteUser, { isLoading: isResending }] = useResendInviteMutation();
  const [collapsedUsers, setCollapsedUsers] = useState<string[]>([]);
  const [isFromGlobalSearch, setIsFromGlobalSearch] = useState(false);
  const [globalSearchBaseQuery, setGlobalSearchBaseQuery] = useState('');
  const [globalSearchField, setGlobalSearchField] = useState('');
  const { role } = useSelector((state: RootState) => state.LoginSlice, shallowEqual);
  const filters = useSelector((state: RootState) => state.UserFiltersSlice);
  const globalSearchQuery = useSelector((state: RootState) => state.globalSearchSlice.query);
  const persistedGlobalSearchField = useSelector(
    (state: RootState) => state.globalSearchSlice.selectedCategoryField
  );

  const { data, isLoading, error, refetch } = useGetUsersQuery(filters);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>(() => {
    return {
      key: filters.sortBy || '',
      direction: (filters.sortDir as SortDirection) || null,
    };
  });

  useEffect(() => {
    const state = location.state as any;

    if (state?.fromGlobalSearch && state?.resetFilters) {
      const baseQuery = state.searchQuery || '';
      const baseField = state.searchField || persistedGlobalSearchField || '';
      setIsFromGlobalSearch(true);
      setGlobalSearchBaseQuery(baseQuery);
      setGlobalSearchField(baseField);
      dispatch(
        setFilters({
          searchQuery: filters.searchQuery || '',
          globalSearchRequestDto: buildInternalGlobalSearchRequestDto(baseQuery, baseField),
          page: 0,
          status: undefined,
          isArchived: undefined,
          isAll: true,
          startDateTime: '',
          endDateTime: '',
          sortBy: undefined,
          sortDir: undefined,
        })
      );

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state, dispatch, persistedGlobalSearchField]);
  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key, direction });
    dispatch(
      setFilters({
        sortBy: direction ? key : undefined,
        sortDir: direction || undefined,
        page: 0,
      })
    );
  };

  const currentSortKey = sortConfig.direction
    ? `${sortConfig.direction === 'desc' ? '-' : ''}${sortConfig.key}`
    : undefined;

  useEffect(() => {
    refetch();
  }, [filters, refetch]);

  useEffect(() => {
    const hasPersistedGlobalSearch = Boolean(filters.globalSearchRequestDto?.text?.trim());

    if (globalSearchQuery.trim()) {
      return;
    }

    if (!isFromGlobalSearch && !hasPersistedGlobalSearch) {
      return;
    }

    setIsFromGlobalSearch(false);
    setGlobalSearchBaseQuery('');
    setGlobalSearchField('');

    dispatch(
      setFilters({
        globalSearchRequestDto: undefined,
        page: 0,
      })
    );

    refetch();
  }, [
    globalSearchQuery,
    isFromGlobalSearch,
    filters.globalSearchRequestDto?.text,
    dispatch,
    refetch,
  ]);

  const toggleCollapse = (key: string) => {
    setCollapsedUsers((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  const handlePageChange = (page: number) => {
    dispatch(setFilters({ page }));
  };

  const handleSearch = (query: string) => {
    dispatch(
      setFilters({
        searchQuery: query,
        page: 0,
      })
    );
  };

  const handleDateTimeChange = (range: DateTimePayload) => {
    dispatch(setFilters(range));
  };

  const handleReset = () => {
    dispatch(
      setFilters({
        startDateTime: '',
        endDateTime: '',
      })
    );
  };

  const handleStatusChange = (value: string) => {
    if (value === 'ACTIVE') {
      dispatch(
        setFilters({
          status: true,
          isArchived: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'ALL') {
      dispatch(
        setFilters({
          isAll: true,
          status: undefined,
          isArchived: undefined,
          page: 0,
        })
      );
    } else if (value === 'INACTIVE') {
      dispatch(
        setFilters({
          status: false,
          isArchived: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'ARCHIVED') {
      dispatch(
        setFilters({
          status: undefined,
          isArchived: true,
          isAll: undefined,
          page: 0,
        })
      );
    } else {
      dispatch(
        setFilters({
          status: undefined,
          isArchived: undefined,
          isAll: true,
          page: 0,
        })
      );
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast({
      message: 'Copied to clipboard',
      type: 'success',
    });
  };

  const renderActions = (record: User) => {
    const isArchived = record.archived;

    const items = [
      {
        key: 'view',
        label: 'View',
        onClick: () => navigate(`/view-user?userId=${record.id}`),
      },
      ...(!isArchived
        ? [
            {
              key: 'edit',
              label: 'Edit',
              onClick: () => navigate(`/edit-user?userId=${record.id}`),
            },
          ]
        : []),
      {
        key: 'archive',
        label: isArchived ? 'Unarchive' : 'Archive',
        onClick: () =>
          handleArchive({
            type: 'user',
            recordId: record.id,
            archiveFn: archiveUser,
            showToast,
            refetch,
            isArchived: !isArchived,
          }),
      },
      ...(!record?.isActiveAndVerified
        ? [
            {
              key: 'resend',
              label: 'Resend Invitation',
              onClick: () =>
                handleResendInvite({
                  type: 'user',
                  recordId: record.id,
                  resendInviteFn: resendInviteUser,
                  showToast,
                  refetch,
                  firstName: record.firstName,
                  emailId: record.emailId,
                }),
            },
          ]
        : []),
    ].filter((item) => {
      if (hasFeatureAccess('user', item.key as any, role)) return true;
      return false;
    });
    return (
      <Dropdown
        menu={{
          items,
        }}
        trigger={['click']}
      >
        <MoreOutlined
          style={{ cursor: 'pointer', fontSize: '20px' }}
          onClick={(e) => e.stopPropagation()}
        />
      </Dropdown>
    );
  };

  useEffect(() => {
    const internalTerm = filters.searchQuery?.trim();
    const globalTerm = filters.globalSearchRequestDto?.text?.trim();

    if (globalTerm && data?.data) {
      setCollapsedUsers(data.data.map((user) => user.id));
    } else if (internalTerm && data?.data) {
      // Auto-expand rows only if search query matches collapsed details (email or phone)
      const matchingUserIds = data.data
        .filter((user) => {
          const searchTerm = internalTerm.toLowerCase();
          return (
            user.emailId.toLowerCase().includes(searchTerm) ||
            user.phoneNumber.toLowerCase().includes(searchTerm)
          );
        })
        .map((user) => user.id);

      setCollapsedUsers(matchingUserIds);
    } else {
      // Clear all expansions when search is cleared
      setCollapsedUsers([]);
    }
  }, [filters.searchQuery, filters.globalSearchRequestDto?.text, data?.data]);

  return (
    <div>
      <MainLayout>
        <div className="w-full p-8 justify-start pt-16">
          {(isLoading || isArchiving || isResending) && <Loader />}
          <div className="flex space-x-4 justify-between p-2">
            {isFromGlobalSearch && filters.searchQuery ? (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                    <LuUsersRound size={18} />
                  </span>
                  <h2 className="text-xl font-semibold">'Showing Results'</h2>
                </div>
                {isFromGlobalSearch && filters.searchQuery && (
                  <span className="text-gray-500 text-sm">for "{filters.searchQuery}"</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                    <LuUsersRound size={18} />
                  </span>
                  <h2 className="text-xl font-semibold"> CFP Users</h2>
                </div>
              </div>
            )}
            <div className="flex space-x-4 ">
              <Search
                appname="User"
                placeholder="Search user..."
                onSearch={handleSearch}
                allowClear
                value={filters.searchQuery || ''}
              />
              <DateTimeRangePicker
                value={handleDateValue(filters)}
                onApply={handleDateTimeChange}
                onReset={handleReset}
              />
              <div className="border border-[var(--border)] p-1 rounded-3xl w-40 max-h-10 flex items-center ">
                <Select
                  placeholder="Status"
                  prefix={<MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />}
                  onChange={handleStatusChange}
                  allowClear
                  className="w-full custom-select"
                  popupClassName="rounded-3xl"
                  value={
                    filters.isArchived
                      ? 'ARCHIVED'
                      : filters.isAll
                        ? 'ALL'
                        : filters.status === true
                          ? 'ACTIVE'
                          : filters.status === false
                            ? 'INACTIVE'
                            : undefined
                  }
                >
                  <Option value="ALL">All</Option>
                  <Option value="ACTIVE">Active</Option>
                  <Option value="INACTIVE">Inactive</Option>
                  <Option value="ARCHIVED">Archived</Option>
                </Select>
              </div>
              {!hasFeatureAccess(role.name.toLowerCase() as any, 'view', role) && (
                <Button
                  appname="add user"
                  className="w-100% text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2"
                  onClick={() => navigate('/add-user')}
                >
                  <PlusOutlined className="text-lg" /> <span>ADD CFP USER</span>
                </Button>
              )}
            </div>
          </div>
          <div className="w-full p-2 justify-start">
            <Row
              gutter={[16, 16]}
              className="font-bold  py-2 px-2 bg-[#FAFAFA] border border-[var(--border)] heading-font"
            >
              <COL
                sortable
                sortKey="firstName"
                currentSortKey={currentSortKey}
                onSort={handleSort}
                span={7}
                className="px-4 py-2  border-[var(--border)]"
              >
                USER DETAILS
              </COL>
              <COL
                sortable
                sortKey="title"
                currentSortKey={currentSortKey}
                onSort={handleSort}
                span={7}
                className="px-4 py-2 border-[var(--border)]"
              >
                TITLE
              </COL>
              <COL
                sortable
                sortKey="role"
                currentSortKey={currentSortKey}
                onSort={handleSort}
                span={6}
                className="px-4 py-2"
              >
                ROLE
              </COL>
              <Col span={4} className="px-4 py-2 border-[var(--border)]">
                ACTIONS
              </Col>
            </Row>
          </div>
          <div className="w-full">
            {data?.data.map((user) => (
              <div key={user.id} className="mb-2">
                <CommonCard>
                  <Row gutter={[16, 16]} align="middle">
                    <Col span={7}>
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={() => toggleCollapse(user.id)}
                      >
                        <Link
                          to={`/view-user?userId=${user.id}`}
                          className="font-semibold underline text-primary hover:text-primary roboto-font"
                        >
                          <p className="font-semibold text-primary underline roboto-font">
                            {renderHighlightedField(user.firstName, 'firstName', filters)}{' '}
                            {renderHighlightedField(user.lastName, 'lastName', filters)}
                          </p>
                        </Link>

                        <span className="ml-2">
                          {collapsedUsers.includes(user.id) ? <UpOutlined /> : <DownOutlined />}
                        </span>
                      </div>
                      {collapsedUsers.includes(user.id) && (
                        <div className="mt-1">
                          <p className="inline-flex items-center gap-1 roboto-font">
                            <span className="font-medium">Email: </span>
                            <span className="underline">
                              {renderHighlightedField(user.emailId, 'emailId', filters)}
                            </span>
                            <MdOutlineCopyAll
                              size={16}
                              className="cursor-pointer hover:text-gray-700 text-primary"
                              onClick={() => handleCopy(user.emailId)}
                            />
                          </p>
                          <p className="roboto-font">
                            <span className="font-medium">Phone Number:</span>{' '}
                            <span>
                              {renderHighlightedField(
                                `${user.countryCode}${formatPhoneNumber(user.phoneNumber)}`,
                                'phoneNumber',
                                filters
                              )}
                            </span>
                          </p>
                        </div>
                      )}
                    </Col>
                    <Col span={7}>
                      <p className="roboto-font">
                        {renderHighlightedField(user.title, 'title', filters)}
                      </p>
                    </Col>
                    <Col span={6}>
                      <p className="roboto-font">
                        {renderHighlightedField(user.role, 'role', filters)}
                      </p>
                    </Col>
                    <Col span={4} className="flex items-center justify-center">
                      {renderActions(user)}
                    </Col>
                  </Row>
                </CommonCard>
              </div>
            ))}
          </div>
          <MasterPagination
            current={filters.page + 1}
            pageSize={filters.size || 10}
            total={data?.totalElements ?? 0}
            itemLabel="Users"
            onPageChange={(page) => handlePageChange(page - 1)}
          />
        </div>
      </MainLayout>
    </div>
  );
};

export default UserTable;
