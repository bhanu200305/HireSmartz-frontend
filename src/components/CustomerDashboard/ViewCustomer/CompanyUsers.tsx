import { useEffect, useState } from 'react';
import { Col, Dropdown, Row, Select } from 'antd';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MdOutlineFilterAlt } from 'react-icons/md';
import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { Loader } from '../../shared/ui/loader';
import { Button, CommonCard, Search, showToast } from '../../shared';
import { COL } from '../../shared/ui/Columns';
import renderHighlightedField from '../../shared/ui/RenderHighlightedField';
import { formatPhoneNumber, formattedDate } from '../../../shared/utils/methods';
import MasterPagination from '../../shared/ui/MasterPagination';
import { Role } from '../../../api/rbac-service/Roles/allRoles';
import { setOrgUserFilters } from '../../../redux/slices/OrgUserFilterSlice';
import {
  useGetCompanyUsersQuery,
  type CompanyUser,
} from '../../../api/tenant-service/Company/getCompanyUsers';
import useFetchAllRoles from '../../../hooks/useAllRoles';
import { SortDirection } from '../../../types';
import { useDebouncedEffect } from '../../../hooks/useDebouncedEffect';
import { SEARCH_DEBOUNCE_MS } from '../../../constants/app.constants';
import { useArchiveOrgUserMutation } from '../../../api/tenant-service/Organisation/AddOrganisationUser';
import { handleArchive, handleResendInvite } from '../../../shared/utils/business-logic';
import { useResendInviteMutation } from '../../../api/tenant-service/User/reinviteUser';

const { Option } = Select;

const CompanyUsers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  const companyIdParam = searchParams.get('companyId');
  const companyId = Number(companyIdParam || 0);
  const hasValidCompanyId = Number.isFinite(companyId) && companyId > 0;
  const returnTo = `${location.pathname}?companyId=${companyId}&tab=3`;

  const filters = useSelector((state: RootState) => state.OrgUserFilterSlice);
  const { roles: allRoles, loading: rolesLoading } = useFetchAllRoles(false);
  const [searchInput, setSearchInput] = useState(filters.searchQuery || '');
  const [archiveUser, { isLoading: isArchiving }] = useArchiveOrgUserMutation();
  const [resendInviteUser, { isLoading: isResending }] = useResendInviteMutation();

  useEffect(() => {
    setSearchInput(filters.searchQuery || '');
  }, [filters.searchQuery]);

  useDebouncedEffect(
    () => {
      if ((filters.searchQuery || '') === searchInput) {
        return;
      }

      dispatch(
        setOrgUserFilters({
          searchQuery: searchInput,
          page: 0,
        })
      );
    },
    [searchInput, filters.searchQuery, dispatch],
    SEARCH_DEBOUNCE_MS
  );

  const { data, isLoading, isFetching, error, refetch } = useGetCompanyUsersQuery(
    {
      companyId,
      ...filters,
    },
    {
      skip: !hasValidCompanyId,
      refetchOnMountOrArgChange: true,
    }
  );

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({
    key: filters.sortBy || '',
    direction: (filters.sortDir as SortDirection) || null,
  });

  const userList = data?.data || [];
  const totalItems = data?.totalElements || data?.total || 0;

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

  const handleSearch = (query: string) => {
    setSearchInput(query);
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
      return;
    }

    if (value === 'INACTIVE') {
      dispatch(
        setOrgUserFilters({
          status: false,
          isArchived: undefined,
          isAll: undefined,
          page: 0,
        })
      );
      return;
    }

    if (value === 'ARCHIVED') {
      dispatch(
        setOrgUserFilters({
          status: undefined,
          isArchived: true,
          isAll: undefined,
          page: 0,
        })
      );
      return;
    }

    dispatch(
      setOrgUserFilters({
        isAll: true,
        status: undefined,
        isArchived: undefined,
        page: 0,
      })
    );
  };

  const getSafeValue = (value?: string | null): string => (value ? String(value) : '-');

  const getPhoneDisplay = (record: CompanyUser): string => {
    const phone = record.phoneNumber ? formatPhoneNumber(String(record.phoneNumber)) : '';
    const value = `${record.countryCode || ''}${phone}`.trim();
    return value || '-';
  };

  const getErrorMessage = (): string => {
    if (!error || typeof error !== 'object') return '';

    if ('data' in error) {
      const dataPayload = (error as { data?: { message?: string } }).data;
      if (dataPayload?.message) {
        return dataPayload.message;
      }
    }

    return 'Failed to load users.';
  };

  const handlePageChange = (page: number) => {
    dispatch(setOrgUserFilters({ page }));
  };

  const renderActions = (record: CompanyUser) => {
    const isArchived = Boolean(record.archived);
    const recordId = Number(record.id);

    return (
      <Dropdown
        menu={{
          items: [
            {
              key: 'view',
              label: 'View',
              onClick: () =>
                navigate(
                  `/view-organisation-user?orgUserId=${recordId}&companyId=${companyId}&returnTo=${encodeURIComponent(returnTo)}`
                ),
            },
            ...(!isArchived
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    onClick: () =>
                      navigate(
                        `/edit-organisation-user?orgUserId=${recordId}&companyId=${companyId}&returnTo=${encodeURIComponent(returnTo)}`
                      ),
                  },
                ]
              : []),
            {
              key: 'archive',
              label: isArchived ? 'Unarchive' : 'Archive',
              onClick: () =>
                handleArchive({
                  type: 'user',
                  recordId,
                  archiveFn: archiveUser,
                  showToast,
                  refetch,
                  isArchived: !isArchived,
                  extraPayload: { companyId },
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
                        recordId,
                        resendInviteFn: resendInviteUser,
                        showToast,
                        refetch,
                        firstName: record.firstName || '',
                        emailId: record.emailId || '',
                        extraPayload: { companyId },
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
    <div className="w-full  p-6  bg-white">
      {(isLoading || isFetching || isArchiving || isResending) && <Loader />}
      <div className="flex space-x-4 justify-between">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold">Users</h2>
          </div>
        </div>
        <div className="flex space-x-4">
          <Search
            appname="User"
            placeholder="Search user..."
            onSearch={handleSearch}
            allowClear
            value={searchInput}
          />
          <div className="border border-[var(--border)] p-1 rounded-3xl flex items-center w-48 max-h-10">
            <Select
              placeholder="All Roles"
              onChange={(value) =>
                dispatch(setOrgUserFilters({ roleTypeMappingId: value ?? null, page: 0 }))
              }
              prefix={<MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />}
              allowClear
              className="w-full custom-select"
              popupClassName="rounded-3xl"
              value={filters.roleTypeMappingId}
              loading={rolesLoading}
            >
              {Array.isArray(allRoles?.data) &&
                allRoles.data.map((role: Role) => (
                  <Option key={role.id} value={role.id}>
                    {role.roleName}
                  </Option>
                ))}
            </Select>
          </div>

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
            onClick={() =>
              navigate(
                `/add-organisation-users?companyId=${companyId}&returnTo=${encodeURIComponent(returnTo)}`
              )
            }
            disabled={!hasValidCompanyId}
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
              span={3}
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
              span={3}
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
              lg={2}
              xl={2}
              className="py-2 px-3 whitespace-nowrap"
            >
              ACTIONS
            </Col>
          </Row>
        </div>
        <div className="w-full">
          {!hasValidCompanyId && (
            <CommonCard>
              <p className="px-3 py-4 roboto-font">Unable to load users: invalid company ID.</p>
            </CommonCard>
          )}

          {hasValidCompanyId && error && (
            <CommonCard>
              <p className="px-3 py-4 roboto-font">{getErrorMessage()}</p>
            </CommonCard>
          )}

          {hasValidCompanyId && !error && userList.length === 0 && !isLoading && !isFetching && (
            <CommonCard>
              <p className="px-3 py-4 roboto-font">No users found.</p>
            </CommonCard>
          )}

          {hasValidCompanyId &&
            !error &&
            userList.map((orgUser: CompanyUser) => (
              <div key={String(orgUser.id)} className="mb-2">
                <CommonCard>
                  <Row gutter={[0, 16]} align="middle">
                    <COL span={3} xs={6} sm={4} md={3} lg={3} xl={3} className="px-3">
                      <Link
                        to={`/view-organisation-user?orgUserId=${orgUser.id}&companyId=${companyId}&returnTo=${encodeURIComponent(returnTo)}`}
                        className="font-semibold underline text-primary hover:text-primary roboto-font"
                      >
                        <p className="font-semibold  text-primary hover:text-primary roboto-font">
                          {orgUser.employeeId
                            ? renderHighlightedField(orgUser.employeeId, 'employeeId', filters)
                            : '-'}
                        </p>
                      </Link>
                    </COL>
                    <COL span={3} xs={6} sm={4} md={3} lg={3} xl={3}>
                      <Link
                        to={`/view-organisation-user?orgUserId=${orgUser.id}&companyId=${companyId}&returnTo=${encodeURIComponent(returnTo)}`}
                        className="font-semibold underline text-primary hover:text-primary roboto-font"
                      >
                        <p className="font-semibold  text-primary hover:text-primary roboto-font">
                          {orgUser.firstName
                            ? renderHighlightedField(orgUser.firstName, 'firstName', filters)
                            : '-'}
                        </p>
                      </Link>
                    </COL>
                    <Col span={3} xs={0} sm={0} md={3} lg={3} xl={2} className="px-1">
                      <p className="roboto-font">
                        {orgUser.lastName
                          ? renderHighlightedField(orgUser.lastName, 'lastName', filters)
                          : '-'}
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
                        title={getSafeValue(orgUser.emailId)}
                      >
                        {orgUser.emailId
                          ? renderHighlightedField(orgUser.emailId, 'emailId', filters)
                          : '-'}
                      </p>
                    </Col>
                    <Col span={3} xs={0} sm={0} md={0} lg={0} xl={3} className="px-4 ml-2">
                      <p className="ml-5 roboto-font whitespace-nowrap">
                        {renderHighlightedField(getPhoneDisplay(orgUser), 'phoneNumber', filters)}
                      </p>
                    </Col>
                    <Col span={3} xs={0} sm={0} md={0} lg={0} xl={3} className="px-3 m-3">
                      <p
                        className="ml-3 mr-2 roboto-font whitespace-nowrap"
                        title={getSafeValue(orgUser?.primaryLocation?.name)}
                      >
                        {orgUser?.primaryLocation?.name
                          ? renderHighlightedField(orgUser.primaryLocation.name, 'name', filters)
                          : '-'}
                      </p>
                    </Col>
                    <Col span={3} xs={6} sm={5} md={5} lg={4} xl={2} className="px-3 ml-2">
                      <p className="ml-3 roboto-font whitespace-nowrap">
                        {orgUser.role
                          ? renderHighlightedField(orgUser.role, 'role', filters)
                          : orgUser.title
                            ? renderHighlightedField(orgUser.title, 'title', filters)
                            : '-'}
                      </p>
                    </Col>
                    <Col span={2} xs={6} sm={3} md={3} lg={2} xl={2} className="px-3">
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
        onPageChange={(page: number) => handlePageChange(page - 1)}
      />
    </div>
  );
};

export default CompanyUsers;
