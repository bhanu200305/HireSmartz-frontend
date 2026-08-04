import { useEffect, useState } from 'react';
import { Button, Search, CommonCard, showToast } from '..';
import { Col, Dropdown, Row, Select } from 'antd';
import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import MasterPagination from '../shared/ui/MasterPagination';
import MainLayout from '../../layouts/MainLayout';
import { LuUsersRound } from 'react-icons/lu';
import { MdOutlineFilterAlt } from 'react-icons/md';
import { DateTimePayload, OrgUser, SortDirection } from '../../types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import { Loader } from '../shared/ui/loader';
import { useGetOrgUsersQuery } from '../../api/tenant-service/Organisation/GetOrganisationUsers';
import { setOrgUserFilters } from '../../redux/slices/OrgUserFilterSlice';
import DateTimeRangePicker from '../shared/ui/datePicker';
import { formatPhoneNumber, formattedDate, handleDateValue } from '../../shared/utils/methods';
import { useArchiveOrgUserMutation } from '../../api/tenant-service/Organisation/AddOrganisationUser';
import { handleArchive, handleResendInvite } from '../../shared/utils/business-logic';
import { COL } from '../shared/ui/Columns';
import useFetchAllRoles from '../../hooks/useAllRoles';
import { Role } from '../../api/rbac-service/Roles/allRoles';
import { useResendInviteMutation } from '../../api/tenant-service/User/reinviteUser';
import renderHighlightedField from '../shared/ui/RenderHighlightedField';
import CollapsePanel from 'antd/es/collapse/CollapsePanel';
import { buildInternalGlobalSearchRequestDto } from '../../shared/utils/filters/internalSearchPayload';

const { Option } = Select;
const OrganisationUserTable = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const filters = useSelector((state: RootState) => state.OrgUserFilterSlice);
  const globalSearchQuery = useSelector((state: RootState) => state.globalSearchSlice.query);
  const persistedGlobalSearchField = useSelector(
    (state: RootState) => state.globalSearchSlice.selectedCategoryField
  );
  const { data, isLoading, error, refetch } = useGetOrgUsersQuery(filters, {
    refetchOnMountOrArgChange: true,
  });
  const [resendInviteUser, { isLoading: isResending }] = useResendInviteMutation();

  const userList = data?.data || [];
  const totalItems = data?.totalElements || 0;
  const [archiveUser, { isLoading: isArchiving }] = useArchiveOrgUserMutation();

  const { roles: allRoles, loading: rolesLoading } = useFetchAllRoles();

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({
    key: filters.sortBy || '',
    direction: (filters.sortDir as SortDirection) || null,
  });

  const [isFromGlobalSearch, setIsFromGlobalSearch] = useState(false);
  const [globalSearchBaseQuery, setGlobalSearchBaseQuery] = useState('');
  const [globalSearchField, setGlobalSearchField] = useState('');

  useEffect(() => {
    const state = location.state as any;

    if (state?.fromGlobalSearch && state?.resetFilters) {
      const baseQuery = state.searchQuery || '';
      const baseField = state.searchField || persistedGlobalSearchField || '';
      setIsFromGlobalSearch(true);
      setGlobalSearchBaseQuery(baseQuery);
      setGlobalSearchField(baseField);
      dispatch(
        setOrgUserFilters({
          searchQuery: filters.searchQuery || '',
          globalSearchRequestDto: buildInternalGlobalSearchRequestDto(baseQuery, baseField),
          page: 0,
          status: undefined,
          isArchived: undefined,
          isAll: true,
          roleTypeMappingId: undefined,
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
      setOrgUserFilters({
        sortBy: direction ? key : undefined,
        sortDir: direction || undefined,
        page: 0,
      })
    );
  };
  const currentSortKey = sortConfig.direction
    ? `${sortConfig.direction === 'desc' ? '-' : ''}${sortConfig.key}`
    : undefined;

  const handlePageChange = (page: number) => {
    dispatch(setOrgUserFilters({ page }));
  };

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
      setOrgUserFilters({
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

  const handleSearch = (query: string) => {
    dispatch(
      setOrgUserFilters({
        searchQuery: query,
        page: 0,
      })
    );
  };

  const handleDateTimeChange = (range: DateTimePayload) => {
    dispatch(setOrgUserFilters(range));
  };

  const handleReset = () => {
    dispatch(
      setOrgUserFilters({
        startDateTime: '',
        endDateTime: '',
      })
    );
  };

  const handleStatusChange = (value: string) => {
    if (value === 'ACTIVE') {
      dispatch(
        setOrgUserFilters({
          status: true,
          isArchived: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'INACTIVE') {
      dispatch(
        setOrgUserFilters({
          status: false,
          isArchived: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'ARCHIVED') {
      dispatch(
        setOrgUserFilters({
          status: undefined,
          isArchived: true,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'ALL') {
      dispatch(
        setOrgUserFilters({
          isAll: true,
          status: undefined,
          isArchived: undefined,
          page: 0,
        })
      );
    } else {
      dispatch(
        setOrgUserFilters({
          status: undefined,
          isAll: true,
          isArchived: undefined,
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

  const renderActions = (record: OrgUser) => {
    const isArchived = record.archived;

    return (
      <Dropdown
        menu={{
          items: [
            {
              key: 'view',
              label: 'View',
              onClick: () => navigate(`/view-organisation-user?orgUserId=${record.id}`),
            },
            ...(!isArchived
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    onClick: () => navigate(`/edit-organisation-user?orgUserId=${record.id}`),
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
          ],
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

  return (
    <div>
      <MainLayout>
        <div className="w-full p-8 justify-start pt-16">
          {(isLoading || isArchiving || isResending) && <Loader />}
          <div className="flex space-x-4 justify-between p-2">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                  <LuUsersRound size={18} />
                </span>
                <h2 className="text-xl font-semibold">
                  {isFromGlobalSearch && filters.searchQuery ? 'Showing Results' : 'Users'}
                </h2>
              </div>
              {isFromGlobalSearch && filters.searchQuery && (
                <span className="text-gray-500 text-sm">for "{filters.searchQuery}"</span>
              )}
            </div>
            <div className="flex space-x-4 ">
              <Search
                appname="User"
                placeholder="Search user..."
                onSearch={handleSearch}
                allowClear
                value={filters.searchQuery || ''}
              />
              <div className="border border-[var(--border)] p-1 rounded-3xl flex items-center w-48 max-h-10">
                <Select
                  placeholder="All Roles"
                  onChange={(value) =>
                    dispatch(setOrgUserFilters({ roleTypeMappingId: value, page: 0 }))
                  }
                  prefix={<MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />}
                  allowClear
                  className="w-full custom-select"
                  popupClassName="rounded-3xl"
                  value={filters.roleTypeMappingId}
                  loading={rolesLoading}
                >
                  {Array.isArray(allRoles?.data) &&
                    allRoles?.data.map((role: Role) => (
                      <Option key={role.id} value={role.id}>
                        {role.roleName}
                      </Option>
                    ))}
                </Select>
              </div>
              <DateTimeRangePicker
                value={handleDateValue(filters)}
                onApply={handleDateTimeChange}
                onReset={handleReset}
              />
              <div className="border border-[var(--border)] p-1 rounded-3xl flex items-center w-40 max-h-10">
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
              <Button
                appname="add user"
                className="w-100% text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2 max-h-10"
                onClick={() => navigate('/add-organisation-users')}
              >
                <PlusOutlined className="text-lg" /> <span>ADD USER</span>
              </Button>
            </div>
          </div>
          <div className="w-full">
            <div className="w-full py-2 justify-start">
              <Row
                gutter={[0, 16]}
                className="font-bold py-2 bg-[#FAFAFA] border border-[var(--border)] heading-font"
              >
                <COL
                  sortable
                  sortKey="employeeId"
                  currentSortKey={currentSortKey}
                  onSort={handleSort}
                  span={3}
                  xs={6}
                  sm={4}
                  md={3}
                  lg={3}
                  xl={3}
                  className="py-2 px-3 border-[var(--border)] whitespace-nowrap"
                >
                  EMPLOYEE ID
                </COL>
                <COL
                  sortable
                  sortKey="firstName"
                  currentSortKey={currentSortKey}
                  onSort={handleSort}
                  span={3}
                  xs={6}
                  sm={4}
                  md={3}
                  lg={3}
                  xl={3}
                  className="py-2 px-3 border-[var(--border)] whitespace-nowrap"
                >
                  FIRST NAME
                </COL>
                <COL
                  sortable
                  sortKey="lastName"
                  currentSortKey={currentSortKey}
                  onSort={handleSort}
                  span={2.5}
                  xs={0}
                  sm={0}
                  md={3}
                  lg={3}
                  xl={3}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  LAST NAME
                </COL>
                <COL
                  sortable
                  sortKey="createdDate"
                  currentSortKey={currentSortKey}
                  onSort={handleSort}
                  span={2}
                  xs={0}
                  sm={0}
                  md={0}
                  lg={2}
                  xl={2}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  ADDED
                </COL>
                <COL
                  sortable
                  sortKey="emailId"
                  currentSortKey={currentSortKey}
                  onSort={handleSort}
                  span={3}
                  xs={0}
                  sm={8}
                  md={7}
                  lg={6}
                  xl={3}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  EMAIL
                </COL>
                <COL
                  sortable
                  sortKey="phoneNumber"
                  currentSortKey={currentSortKey}
                  onSort={handleSort}
                  span={3}
                  xs={0}
                  sm={0}
                  md={0}
                  lg={0}
                  xl={3}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  PHONE NUMBER
                </COL>
                <COL
                  sortable
                  sortKey="primaryLocation"
                  currentSortKey={currentSortKey}
                  onSort={handleSort}
                  span={3}
                  xs={0}
                  sm={0}
                  md={0}
                  lg={0}
                  xl={3}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  LOCATION
                </COL>
                <COL
                  sortable
                  sortKey="role"
                  currentSortKey={currentSortKey}
                  onSort={handleSort}
                  span={2}
                  xs={6}
                  sm={5}
                  md={5}
                  lg={4}
                  xl={2}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  ROLE
                </COL>
                <Col
                  span={2}
                  xs={6}
                  sm={3}
                  md={3}
                  lg={3}
                  xl={2}
                  className="py-2 px-3 flex items-center justify-end border-[var(--border)] whitespace-nowrap"
                >
                  ACTIONS
                </Col>
              </Row>
            </div>
            <div className="w-full">
              {userList.map((orgUser: any) => (
                <div key={orgUser.id} className="mb-2">
                  <CommonCard>
                    <Row gutter={[0, 16]} align="middle">
                      <COL span={3} xs={6} sm={4} md={3} lg={3} xl={3} className="px-3">
                        <Link
                          to={`/view-organisation-user?orgUserId=${orgUser.id}`}
                          className="font-semibold underline text-primary hover:text-primary roboto-font"
                        >
                          <p className="roboto-font text-primary">
                            {renderHighlightedField(orgUser.employeeId, 'employeeId', filters)}
                          </p>
                        </Link>
                      </COL>
                      <COL span={3} xs={6} sm={4} md={3} lg={3} xl={3}>
                        <Link
                          to={`/view-organisation-user?orgUserId=${orgUser.id}`}
                          className="font-semibold underline text-primary hover:text-primary roboto-font"
                        >
                          <p className="roboto-font text-primary">
                            {renderHighlightedField(orgUser.firstName, 'firstName', filters)}
                          </p>
                        </Link>
                      </COL>
                      <Col span={3} xs={0} sm={0} md={3} lg={3} xl={2} className="px-1">
                        <p className="roboto-font">
                          {renderHighlightedField(orgUser.lastName, 'lastName', filters)}
                        </p>
                      </Col>
                      <Col span={3} xs={0} sm={0} md={0} lg={2} xl={2} className="px-5 ml-4">
                        <p className="ml-5 roboto-font whitespace-nowrap">
                          {orgUser.createdDate ? formattedDate(orgUser.createdDate) : '-'}
                        </p>
                      </Col>
                      <Col span={3} xs={0} sm={8} md={7} lg={6} xl={3} className="px-4 ml-2">
                        <p
                          className="ml-5 roboto-font whitespace-nowrap overflow-hidden text-ellipsis"
                          title={orgUser.emailId}
                        >
                          {renderHighlightedField(orgUser.emailId, 'emailId', filters)}
                        </p>
                      </Col>
                      <Col span={3} xs={0} sm={0} md={0} lg={0} xl={3} className="px-4 ml-2">
                        <p className="ml-5 roboto-font whitespace-nowrap">
                          {renderHighlightedField(
                            `${orgUser.countryCode}${formatPhoneNumber(orgUser.phoneNumber)}`,
                            'phoneNumber',
                            filters
                          )}
                        </p>
                      </Col>
                      <Col span={3} xs={0} sm={0} md={0} lg={0} xl={3} className="ml-4">
                        <p className="ml-5 roboto-font" title={orgUser?.primaryLocation?.name}>
                          {renderHighlightedField(orgUser?.primaryLocation?.name, 'name', filters)}
                        </p>
                      </Col>
                      <Col span={2} xs={6} sm={5} md={5} lg={4} xl={2} className="px-3 ml-2">
                        <p className="ml-3 roboto-font whitespace-nowrap" title={orgUser.role}>
                          {renderHighlightedField(orgUser.role, 'role', filters)}
                        </p>
                      </Col>
                      <Col
                        span={1}
                        xs={6}
                        sm={3}
                        md={3}
                        lg={3}
                        xl={1}
                        className="ml-3 px-3 flex justify-end"
                      >
                        {renderActions(orgUser)}
                      </Col>
                    </Row>
                  </CommonCard>
                </div>
              ))}
            </div>
          </div>
          <MasterPagination
            current={filters.page + 1}
            pageSize={filters.size || 10}
            total={totalItems}
            itemLabel="Users"
            onPageChange={(page) => handlePageChange(page - 1)}
          />
        </div>
      </MainLayout>
    </div>
  );
};

export default OrganisationUserTable;
