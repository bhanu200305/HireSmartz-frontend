import { useEffect, useState } from 'react';
import { Button, Search, CommonCard, showToast } from '..';
import { Col, Dropdown, Row, Select, Tooltip } from 'antd';
import { DownOutlined, MoreOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import MasterPagination from '../shared/ui/MasterPagination';
import MainLayout from '../../layouts/MainLayout';
import { FaCity } from 'react-icons/fa';
import './customerPage.css';
import { MdOutlineCopyAll, MdOutlineFilterAlt } from 'react-icons/md';
import { DateTimePayload, SortDirection, User } from '../../types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import { Loader } from '../shared/ui/loader';
import { useGetCompaniesQuery } from '../../api/tenant-service/Company/getComapany';
import { useArchiveCompanyMutation } from '../../api/tenant-service/Company/archiveCompany';
import { setCompanyFilters } from '../../redux/slices/companyFilterSlice';
import DateTimeRangePicker from '../shared/ui/datePicker';
import { formatPhoneNumber, handleDateValue } from '../../shared/utils/methods';
import { handleArchive } from '../../shared/utils/business-logic';
import { COL } from '../shared/ui/Columns';
import { hasFeatureAccess } from '../../shared/utils/auth/getAccess';
import renderHighlightedField from '../shared/ui/RenderHighlightedField';
import { useImpersonateByUserMutation } from '../../api/authentication-service/Impersonation/index';
import { get } from 'lodash-es';
import ImpersonationModal from './ImpersonationModal';
import { buildInternalGlobalSearchRequestDto } from '../../shared/utils/filters/internalSearchPayload';
import useEffectivePermissions from '../../hooks/useEffectivePermissions';

const { Option } = Select;

type CompanyActionRecord = User & {
  companyName?: string;
};

const CustomerTable = () => {
  const role = useSelector((state: RootState) => state.LoginSlice.role);
  const effectivePermissions = useEffectivePermissions();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const [collapsedUsers, setCollapsedUsers] = useState<string[]>([]);
  const [isFromGlobalSearch, setIsFromGlobalSearch] = useState(false);
  const [impersonationModalOpen, setImpersonationModalOpen] = useState(false);
  const [impersonationUsers, setImpersonationUsers] = useState<any[]>([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [, setGlobalSearchBaseQuery] = useState('');
  const [, setGlobalSearchField] = useState('');

  const filters = useSelector((state: RootState) => state.CompanyFilterSlice);
  const globalSearchQuery = useSelector((state: RootState) => state.globalSearchSlice.query);
  const persistedGlobalSearchField = useSelector(
    (state: RootState) => state.globalSearchSlice.selectedCategoryField
  );
  const { data, isLoading, refetch } = useGetCompaniesQuery(filters);
  const [archieveCompany, { isLoading: isArchiving }] = useArchiveCompanyMutation();
  const [impersonateByUser, { isLoading: isImpersonating }] = useImpersonateByUserMutation();

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({
    key: filters.sortBy || '',
    direction: (filters.sortDir as SortDirection) || null,
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
        setCompanyFilters({
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

  useEffect(() => {
    const internalTerm = filters.searchQuery?.trim();
    const globalTerm = filters.globalSearchRequestDto?.text?.trim();
    const globalField = filters.globalSearchRequestDto?.field?.trim();

    const COLLAPSED_FIELDS = ['primaryEmail', 'websiteUrl', 'addressLine1'];

    if (internalTerm && data?.data) {
      const searchTerm = internalTerm.toLowerCase();
      const matchingIds = data.data
        .filter(
          (company) =>
            company.primaryEmail?.toLowerCase().includes(searchTerm) ||
            company.websiteUrl?.toLowerCase().includes(searchTerm) ||
            company.addressLine1?.toLowerCase().includes(searchTerm)
        )
        .map((company) => company.id);
      setCollapsedUsers(matchingIds);
    } else if (globalTerm && data?.data) {
      if (globalField && COLLAPSED_FIELDS.includes(globalField)) {
        setCollapsedUsers(data.data.map((company) => company.id));
      } else if (!globalField) {
        const searchTerm = globalTerm.toLowerCase();
        const matchingIds = data.data
          .filter(
            (company) =>
              company.primaryEmail?.toLowerCase().includes(searchTerm) ||
              company.websiteUrl?.toLowerCase().includes(searchTerm) ||
              company.addressLine1?.toLowerCase().includes(searchTerm)
          )
          .map((company) => company.id);
        setCollapsedUsers(matchingIds);
      } else {
        setCollapsedUsers([]);
      }
    } else {
      setCollapsedUsers([]);
    }
  }, [
    filters.searchQuery,
    filters.globalSearchRequestDto?.text,
    filters.globalSearchRequestDto?.field,
    data?.data,
  ]);

  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key, direction });
    dispatch(
      setCompanyFilters({
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
      setCompanyFilters({
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
    dispatch(setCompanyFilters({ page }));
  };

  const handleSearch = (query: string) => {
    dispatch(
      setCompanyFilters({
        searchQuery: query,
        page: 0,
      })
    );
  };

  const handleDateTimeChange = (range: DateTimePayload) => {
    dispatch(setCompanyFilters(range));
  };

  const handleReset = () => {
    dispatch(
      setCompanyFilters({
        startDateTime: '',
        endDateTime: '',
      })
    );
  };

  const handleStatusChange = (value: string) => {
    if (value === 'ACTIVE') {
      dispatch(
        setCompanyFilters({
          status: true,
          isArchived: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'INACTIVE') {
      dispatch(
        setCompanyFilters({
          status: false,
          isArchived: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'ARCHIVED') {
      dispatch(
        setCompanyFilters({
          status: undefined,
          isArchived: true,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'ALL') {
      dispatch(
        setCompanyFilters({
          status: undefined,
          isArchived: undefined,
          isAll: true,
          page: 0,
        })
      );
    } else {
      dispatch(
        setCompanyFilters({
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

  const handleImpersonate = async (companyId: number, companyName?: string) => {
    try {
      const response = await impersonateByUser(companyId).unwrap();
      const users = Array.isArray(response?.data) ? response.data : [];

      if (users.length === 0) {
        showToast({
          message: response?.message || 'No users found for impersonation.',
          type: 'error',
        });
        return;
      }

      setImpersonationUsers(users);
      setSelectedCompanyName(companyName || '');
      setImpersonationModalOpen(true);
    } catch (error: unknown) {
      const errorMessage = get(error, 'data.message', 'Failed to load impersonation users.');
      showToast({
        message: errorMessage,
        type: 'error',
      });
    }
  };

  const renderActions = (record: CompanyActionRecord) => {
    const isArchived = record.archived;
    return (
      <Dropdown
        menu={{
          items: [
            {
              key: 'view',
              label: 'View',
              onClick: () => navigate(`/view-company?companyId=${record.id}`),
            },
            {
              key: 'edit',
              label: 'Edit',
              onClick: () => navigate(`/edit-company?companyId=${record.id}`),
            },
            {
              key: 'impersonate',
              label: 'Impersonate',
              onClick: () => handleImpersonate(record.id, record.companyName),
            },
            {
              key: 'archive',
              label: isArchived ? 'Unarchive' : 'Archive',
              onClick: () =>
                handleArchive({
                  type: 'company',
                  recordId: record.id,
                  archiveFn: archieveCompany,
                  showToast,
                  refetch,
                  isArchived: !isArchived,
                }),
            },
          ].filter((item) => {
            // Show impersonate only for Master Super Admin
            if (item.key === 'impersonate') {
              return role?.name === 'Master Super Admin';
            }
            if (hasFeatureAccess('user', item.key as any, role, effectivePermissions)) return true;
            return false;
          }),
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
          {(isLoading || isArchiving || isImpersonating) && <Loader />}
          <div className="flex space-x-4 justify-between p-2">
            {isFromGlobalSearch && filters.searchQuery ? (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                    <FaCity size={18} />
                  </span>
                  <h2 className="text-xl font-semibold">&apos;Showing Results&apos;</h2>
                </div>
                <span className="text-gray-500 text-sm">for &quot;{filters.searchQuery}&quot;</span>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                    <FaCity size={18} />
                  </span>
                  <h2 className="text-xl font-semibold">Companies</h2>
                </div>
              </div>
            )}
            <div className="flex space-x-4 items-center">
              <Search
                appname="customers"
                placeholder="Search company..."
                onSearch={handleSearch}
                allowClear
                value={filters.searchQuery || ''}
              />

              <DateTimeRangePicker
                value={handleDateValue(filters)}
                onApply={handleDateTimeChange}
                onReset={handleReset}
              />
              <div className="border border-[var(--border)] p-1 rounded-3xl w-40 max-h-10 flex items-center">
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
              {!hasFeatureAccess(
                role.name.toLowerCase() as any,
                'view',
                role,
                effectivePermissions
              ) && (
                <Button
                  appname="add user"
                  className="w-100% text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2"
                  onClick={() => navigate('/add-company')}
                >
                  <PlusOutlined className="text-lg" /> <span>ADD COMPANY</span>
                </Button>
              )}
            </div>
          </div>
          <div className="w-full p-2 justify-start overflow-x-auto">
            <Row
              gutter={[16, 16]}
              className="font-bold py-2 px-2 bg-[#FAFAFA] border border-[var(--border)] flex !flex-nowrap heading-font"
            >
              <COL
                sortable
                sortKey="companyName"
                currentSortKey={currentSortKey}
                onSort={handleSort}
                span={5}
                className="px-4 py-2 border-[var(--border)]"
              >
                COMPANY DETAILS
              </COL>
              <COL
                sortable
                sortKey="locationName"
                currentSortKey={currentSortKey}
                onSort={handleSort}
                span={4}
                className="px-4 py-2 border-[var(--border)]"
              >
                PRIMARY LOCATION
              </COL>
              <COL
                sortable
                sortKey="primaryFirstName"
                currentSortKey={currentSortKey}
                onSort={handleSort}
                span={4}
                className="px-4 py-2 border-[var(--border)] whitespace-nowrap !pl-0"
              >
                PRIMARY CONTACT
              </COL>
              {/* <Col span={2.5} className="px-4 py-2 border-[var(--border)]">
                PHONE NO
              </Col> */}
              <COL span={3} className="px-4 py-2 border-[var(--border)]">
                INTERVIEW COUNT
              </COL>
              {/* <Col span={2} className="px-4 py-2 border-[var(--border)]">
                PACKAGE
              </Col> */}
              <COL span={3} className="px-4 py-2 border-[var(--border)]">
                RECRUITERS
              </COL>
              <COL span={3} className="px-4 py-2 border-[var(--border)]">
                HIRING MANAGER
              </COL>
              <COL span={2} className="px-4 py-2 border-[var(--border)]">
                ACTIONS
              </COL>
            </Row>
          </div>
          <div className="w-full">
            {data?.data.map((company) => (
              <div key={company.id} className="mb-2">
                <CommonCard>
                  <Row gutter={[16, 16]} align="middle">
                    <Col span={5}>
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={() => toggleCollapse(company.id)}
                      >
                        <Link
                          to={`/view-company?companyId=${company.id}`}
                          className="font-semibold underline text-primary hover:text-primary roboto-font"
                        >
                          <p className="font-semibold underline text-primary roboto-font">
                            {renderHighlightedField(company.companyName, 'companyName', filters)}
                          </p>
                        </Link>
                        <span className="ml-2">
                          {collapsedUsers.includes(company.id) ? <UpOutlined /> : <DownOutlined />}
                        </span>
                      </div>
                      {collapsedUsers.includes(company.id) && (
                        <div>
                          <p className="inline-flex items-center gap-1 roboto-font">
                            <span className="font-medium">Email: </span>
                            <span className="underline">
                              {renderHighlightedField(
                                company.primaryEmail,
                                'primaryEmail',
                                filters
                              )}
                            </span>
                            <MdOutlineCopyAll
                              size={16}
                              className="cursor-pointer hover:text-gray-700 text-primary"
                              onClick={() => handleCopy(company.primaryEmail)}
                            />
                          </p>
                          <p>
                            <p className="inline-flex items-center gap-1 max-w-full roboto-font">
                              <span className="font-medium whitespace-nowrap">Website Link: </span>
                              {company.websiteUrl ? (
                                <div className="flex items-center gap-1 min-w-0">
                                  <Tooltip
                                    title={company.websiteUrl}
                                    className="[&_.ant-tooltip-inner]:max-w-[500px] [&_.ant-tooltip-inner]:break-all"
                                    mouseEnterDelay={0.3}
                                  >
                                    <span className="truncate block max-w-[200px]">
                                      {renderHighlightedField(
                                        company.websiteUrl,
                                        'websiteUrl',
                                        filters
                                      )}
                                    </span>
                                  </Tooltip>
                                  <MdOutlineCopyAll
                                    size={16}
                                    className="flex-shrink-0 cursor-pointer hover:text-gray-700 text-primary"
                                    onClick={() => handleCopy(company.websiteUrl)}
                                  />
                                </div>
                              ) : (
                                <span>N/A</span>
                              )}
                            </p>
                          </p>
                          <p>
                            <span className="font-medium roboto-font">Address: </span>{' '}
                            <span className="roboto-font">
                              {renderHighlightedField(
                                company.addressLine1,
                                'addressLine1',
                                filters
                              )}
                            </span>
                          </p>
                        </div>
                      )}
                    </Col>
                    <COL span={4} className="!pl-0">
                      <p className="ml-2 roboto-font">
                        {renderHighlightedField(company?.primaryLocation?.name, 'name', filters)}
                      </p>
                    </COL>
                    <Col span={4} className="!pl-0">
                      <p className=" roboto-font">
                        {renderHighlightedField(
                          company.primaryFirstName + ' ' + company.primaryLastName,
                          'primaryFirstName',
                          filters
                        )}
                      </p>
                      <p className=" roboto-font">
                        {renderHighlightedField(
                          `${company.primaryCountryCode}${formatPhoneNumber(company.primaryPhone)}`,
                          'primaryPhone',
                          filters
                        )}
                      </p>
                    </Col>
                    {/* <Col span={3}>
                    </Col> */}
                    <Col span={3}>
                      <p className="roboto-font">
                        {renderHighlightedField(
                          company.interviewCount?.toString(),
                          'interviewCount',
                          filters
                        )}
                      </p>
                    </Col>
                    {/* <Col span={2}>
                      <p className="roboto-font">
                        {renderHighlightedField(company.packages, 'packages', filters)}
                      </p>
                    </Col> */}
                    <Col span={3}>
                      <p className="roboto-font">
                        {renderHighlightedField(
                          company.recruiters?.toString(),
                          'recruiters',
                          filters
                        )}
                      </p>
                    </Col>
                    <Col span={3}>
                      <p className="roboto-font">
                        {renderHighlightedField(
                          company.hiringManager?.toString(),
                          'hiringManager',
                          filters
                        )}
                      </p>
                    </Col>
                    <Col span={2} className="flex items-center justify-center">
                      {renderActions(company)}
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
            itemLabel="Companies"
            onPageChange={(page) => handlePageChange(page - 1)}
          />
        </div>
        <ImpersonationModal
          open={impersonationModalOpen}
          onClose={() => {
            setImpersonationModalOpen(false);
            setImpersonationUsers([]);
            setSelectedCompanyName('');
          }}
          users={impersonationUsers}
          usersLoading={isImpersonating}
          companyName={selectedCompanyName}
        />
      </MainLayout>
    </div>
  );
};

export default CustomerTable;
