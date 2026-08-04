import React, { useState, useEffect } from 'react';
import { Tabs, Modal, Dropdown } from 'antd';
import type { TabsProps, MenuProps } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { VscOrganization } from 'react-icons/vsc';
import { Button, Input, Select } from '../shared';
import {
  useGetDepartmentsQuery,
  useImportDepartmentsMutation,
  useAddCustomDepartmentMutation,
  useGetDepartmentJobTitlesQuery,
  useConfigureDepartmentJobTitlesMutation,
  useUpdateCustomDepartmentMutation,
} from '../../api/tenant-service/MyCompany/departments';
import {
  useGetJobRolesQuery,
  useImportJobRolesMutation,
  useAddCustomJobRoleMutation,
  useUpdateCustomJobRoleMutation,
  useDeleteCustomJobRoleMutation,
} from '../../api/tenant-service/MyCompany/jobRoles';
import { useSearchParams } from 'react-router-dom';
import { Loader } from '../shared/ui/loader';
import { showToast } from '../shared/ui/toast';
import ImportFromMasterModal from './ImportFromMasterModal';
import AddEditDepartmentModal from './AddEditDepartmentModal';
import ImportRolesFromMasterModal from './ImportRolesFromMasterModal';
import AddEditJobRoleModal from './AddEditJobRoleModal';

import { MasterTable } from '../shared/ui/MasterTable';
import type { SortDirection } from '../../types';
const OrganizationModel: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [modal, contextHolder] = Modal.useModal();
  const currentSubTab = searchParams.get('subtab') || '1';

  const handleSubTabChange = (key: string) => {
    searchParams.set('subtab', key);
    // Don't lose parent tab context
    if (!searchParams.has('tab')) {
      searchParams.set('tab', '3'); // Organization Model is tab 3
    }
    setSearchParams(searchParams);
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportRoleModalOpen, setIsImportRoleModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isAddEditRoleModalOpen, setIsAddEditRoleModalOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<{
    id?: number;
    name: string;
    isActive: boolean;
  } | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<{
    id?: number;
    name: string;
    isActive: boolean;
    departmentIds: number[];
  } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const size = 10;

  const [deptSortBy, setDeptSortBy] = useState('name');
  const [deptSortDir, setDeptSortDir] = useState('ASC');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(0); // Reset page on search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  const [roleSearchText, setRoleSearchText] = useState('');
  const [roleDebouncedSearch, setRoleDebouncedSearch] = useState('');
  const [roleSource, setRoleSource] = useState('all');
  const [roleStatus, setRoleStatus] = useState('all');
  const [rolePage, setRolePage] = useState(0);

  const [roleSortBy, setRoleSortBy] = useState('name');
  const [roleSortDir, setRoleSortDir] = useState('ASC');

  useEffect(() => {
    const handler = setTimeout(() => {
      setRoleDebouncedSearch(roleSearchText);
      setRolePage(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [roleSearchText]);

  const [importDepartments] = useImportDepartmentsMutation();
  const [addCustomDepartment] = useAddCustomDepartmentMutation();
  const [updateCustomDepartment] = useUpdateCustomDepartmentMutation();
  const [importJobRoles] = useImportJobRolesMutation();
  const [addCustomJobRole] = useAddCustomJobRoleMutation();
  const [updateCustomJobRole] = useUpdateCustomJobRoleMutation();
  const [deleteCustomJobRole] = useDeleteCustomJobRoleMutation();
  const [configureJobTitles] = useConfigureDepartmentJobTitlesMutation();

  const [mappingDepartmentId, setMappingDepartmentId] = useState<number | undefined>();
  const [mappingSearchText, setMappingSearchText] = useState('');

  const { data: mappingJobTitlesData, isFetching: isMappingFetching } =
    useGetDepartmentJobTitlesQuery(
      { departmentId: mappingDepartmentId! },
      { skip: !mappingDepartmentId }
    );

  const { data: departmentsData } = useGetDepartmentsQuery({
    page: 0,
    size: 1000,
    status: 'active',
  });

  const mappingDepartmentOptions = (departmentsData?.content ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map((dept) => ({
      label: dept.name,
      value: String(dept.id),
    }));

  const { data: allJobRolesData } = useGetJobRolesQuery({
    page: 0,
    size: 1000,
    search: mappingSearchText || undefined,
  });

  const { data } = useGetDepartmentsQuery({
    page,
    size,
    search: debouncedSearch || undefined,
    source: source === 'all' ? undefined : source,
    status: status === 'all' ? undefined : status,
    sortBy: deptSortBy,
    sortDirection: deptSortDir,
  });

  const departments = data?.content || [];
  const totalElements = data?.totalElements || 0;

  const departmentData = departments.map((dept) => ({
    key: dept.id.toString(),
    name: dept.name,
    source: dept.source === 'CUSTOM' ? 'Custom' : 'Inherited',
    rolesCount: dept.jobTitlesConfigured > 0 ? dept.jobTitlesConfigured : 'Not Configured',
    status: dept.status === 'ACTIVE' ? 'Active' : 'Inactive',
  }));

  const currentDeptSortKey = deptSortBy
    ? deptSortDir === 'DESC'
      ? `-${deptSortBy}`
      : deptSortBy
    : undefined;

  const columns = [
    {
      title: 'DEPARTMENT',
      dataIndex: 'name',
      key: 'name',
      span: 7,
      sortKey: 'name',
      render: (text: string) => <span className="text-gray-700">{text}</span>,
    },
    {
      title: 'SOURCE',
      dataIndex: 'source',
      key: 'source',
      span: 4,
      sortKey: 'source',
      render: (text: string) => (
        <span
          className={
            text === 'Inherited' ? 'text-[#008A2E] font-medium' : 'text-[#005FF8] font-medium'
          }
        >
          {text === 'Inherited' ? 'Template' : 'Custom'}
        </span>
      ),
    },
    {
      title: 'JOB TITLES',
      dataIndex: 'rolesCount',
      key: 'rolesCount',
      span: 5,
      sortKey: 'jobTitleCount',
      render: (text: string | number) => <span className="text-gray-500">{text}</span>,
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      span: 4,
      sortKey: 'status',
      render: (text: string) => (
        <span
          className={text === 'Active' ? 'text-[#008A2E] font-medium' : 'text-gray-400 font-medium'}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      span: 4,
      render: (_: any, record: any) => {
        const rawDept = departments.find((d) => d.id.toString() === record.key);
        const getActionMenu = (): MenuProps['items'] => [
          {
            key: '1',
            label: 'Edit',
            onClick: () => {
              if (rawDept) {
                setDepartmentToEdit({
                  id: rawDept.id,
                  name: rawDept.name,
                  isActive: rawDept.status === 'ACTIVE',
                });
                setIsAddEditModalOpen(true);
              }
            },
          },
          {
            key: '2',
            label: rawDept?.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
            onClick: async () => {
              if (rawDept) {
                try {
                  await updateCustomDepartment({
                    id: rawDept.id,
                    name: rawDept.name,
                    status: rawDept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  }).unwrap();
                  showToast({
                    type: 'success',
                    message: `Department ${rawDept.status === 'ACTIVE' ? 'deactivated' : 'activated'} successfully`,
                  });
                } catch (error: any) {
                  showToast({
                    type: 'error',
                    message: error?.data?.message || 'Failed to update department status',
                  });
                }
              }
            },
          },
          {
            key: '3',
            label: 'Settings',
            onClick: () => {
              if (rawDept) {
                setMappingDepartmentId(rawDept.id);
                handleSubTabChange('3');
              }
            },
          },
        ];
        return (
          <div className="flex gap-4 items-center">
            <Dropdown menu={{ items: getActionMenu() }} trigger={['click']} placement="bottomRight">
              <Button className="p-1 border-none hover:bg-gray-100 bg-transparent text-gray-500 shadow-none h-auto w-auto flex items-center justify-center">
                <BsThreeDotsVertical style={{ fontSize: 16 }} />
              </Button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  const { data: roleData } = useGetJobRolesQuery({
    page: rolePage,
    size,
    search: roleDebouncedSearch || undefined,
    source: roleSource === 'all' ? undefined : roleSource,
    status: roleStatus === 'all' ? undefined : roleStatus,
    sortBy: roleSortBy,
    sortDirection: roleSortDir,
  });

  const jobRoles = roleData?.content || [];
  const totalRoleElements = roleData?.totalElements || 0;

  const jobRoleMappedData = jobRoles.map((role) => ({
    key: role.id.toString(),
    name: role.name,
    source: role.source === 'CUSTOM' ? 'Custom' : 'Inherited',
    mappedToDepartment: role.mappedToDepartments?.length
      ? role.mappedToDepartments.map((d) => d.departmentName).join(', ')
      : '-',
    status: role.status === 'ACTIVE' ? 'Active' : 'Inactive',
  }));

  const currentRoleSortKey = roleSortBy
    ? roleSortDir === 'DESC'
      ? `-${roleSortBy}`
      : roleSortBy
    : undefined;

  const roleColumns = [
    {
      title: 'JOB TITLE',
      dataIndex: 'name',
      key: 'name',
      span: 7,
      sortKey: 'name',
      render: (text: string) => <span className="text-gray-700">{text}</span>,
    },
    {
      title: 'SOURCE',
      dataIndex: 'source',
      key: 'source',
      span: 4,
      sortKey: 'source',
      render: (text: string) => (
        <span
          className={
            text === 'Inherited' ? 'text-[#008A2E] font-medium' : 'text-[#005FF8] font-medium'
          }
        >
          {text === 'Inherited' ? 'Template' : 'Custom'}
        </span>
      ),
    },
    {
      title: 'DEPARTMENT',
      dataIndex: 'mappedToDepartment',
      key: 'mappedToDepartment',
      span: 5,
      sortKey: 'department',
      render: (text: string) => <span className="text-gray-500">{text}</span>,
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      span: 4,
      sortKey: 'status',
      render: (text: string) => (
        <span
          className={text === 'Active' ? 'text-[#008A2E] font-medium' : 'text-gray-400 font-medium'}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      span: 4,
      render: (_: any, record: any) => {
        const rawRole = jobRoles.find((r) => r.id.toString() === record.key);
        const getActionMenu = (): MenuProps['items'] => [
          {
            key: '1',
            label: 'Edit',
            onClick: () => {
              if (rawRole) {
                setRoleToEdit({
                  id: rawRole.id,
                  name: rawRole.name,
                  isActive: rawRole.status === 'ACTIVE',
                  departmentIds: rawRole.mappedToDepartments?.map((d) => d.departmentId) || [],
                });
                setIsAddEditRoleModalOpen(true);
              }
            },
          },
          {
            key: '2',
            label: rawRole?.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
            onClick: async () => {
              if (rawRole) {
                try {
                  await updateCustomJobRole({
                    id: rawRole.id,
                    name: rawRole.name,
                    status: rawRole.status !== 'ACTIVE',
                    departmentIds: rawRole.mappedToDepartments?.map((d) => d.departmentId) || [],
                  }).unwrap();
                  showToast({
                    type: 'success',
                    message: `Job title ${rawRole.status === 'ACTIVE' ? 'deactivated' : 'activated'} successfully`,
                  });
                } catch (error: any) {
                  showToast({
                    type: 'error',
                    message: error?.data?.message || 'Failed to update job title status',
                  });
                }
              }
            },
          },
          {
            key: '3',
            label: 'Delete',
            onClick: () => {
              if (rawRole) {
                modal.confirm({
                  title: 'Delete Job Title',
                  content: `Are you sure you want to delete "${rawRole.name}"? This action cannot be undone.`,
                  okText: 'Delete',
                  okType: 'danger',
                  cancelText: 'Cancel',
                  onOk: async () => {
                    try {
                      await deleteCustomJobRole(rawRole.id).unwrap();
                      showToast({ type: 'success', message: 'Job title deleted successfully' });
                    } catch (error: any) {
                      showToast({
                        type: 'error',
                        message: error?.data?.message || 'Failed to delete job title',
                      });
                    }
                  },
                });
              }
            },
          },
        ];
        return (
          <div className="flex gap-4 items-center">
            <Dropdown menu={{ items: getActionMenu() }} trigger={['click']} placement="bottomRight">
              <Button className="p-1 border-none hover:bg-gray-100 bg-transparent text-gray-500 shadow-none h-auto w-auto flex items-center justify-center">
                <BsThreeDotsVertical style={{ fontSize: 16 }} />
              </Button>
            </Dropdown>
          </div>
        );
      },
    },
  ];
  const handleDeptSort = (key: string, direction: SortDirection): void => {
    setDeptSortBy(direction ? key : 'name');
    setDeptSortDir(direction === 'desc' ? 'DESC' : 'ASC');
  };

  const handleRoleSort = (key: string, direction: SortDirection): void => {
    setRoleSortBy(direction ? key : 'name');
    setRoleSortDir(direction === 'desc' ? 'DESC' : 'ASC');
  };
  const myDepartmentsContent = (
    <div className="mt-4">
      <p className="text-sm text-gray-500 mb-8 font-medium">
        Set up your company&apos;s Departments by importing them from a template or create custom
        departments. You can add Job Titles to these departments under Department Settings.
      </p>
      <MasterTable
        title="Departments"
        columns={columns}
        dataSource={departmentData}
        error={null}
        onAddClick={() => {
          setDepartmentToEdit(null);
          setIsAddEditModalOpen(true);
        }}
        addButtonLabel="+ ADD DEPARTMENT"
        filters={{
          searchPlaceholder: 'Search Departments...',
          filterOptions: [
            {
              label: 'All Sources',
              value: 'source',
              options: [
                { label: 'Template', value: 'inherited' },
                { label: 'Custom', value: 'custom' },
              ],
            },
            {
              label: 'All Statuses',
              value: 'status',
              options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ],
            },
          ],
          extraActions: (
            <Button
              className="px-5 text-sm rounded-full h-11 border border-gray-300 flex items-center gap-2 hover:bg-gray-50 bg-white"
              onClick={() => setIsImportModalOpen(true)}
            >
              <DownloadOutlined /> Import from Template
            </Button>
          ),
        }}
        pagination={{
          current: page + 1,
          pageSize: size,
          total: totalElements,
          onPageChange: (p) => setPage(p - 1),
          onPageSizeChange: () => {},
        }}
        currentSortKey={currentDeptSortKey}
        onSort={handleDeptSort}
        onSearch={setSearchText}
        onFilterChange={(filterKey, value) => {
          if (filterKey === 'source') {
            setSource(value === '' ? 'all' : value);
            setPage(0);
          }
          if (filterKey === 'status') {
            setStatus(value === '' ? 'all' : value);
            setPage(0);
          }
        }}
      />
    </div>
  );
  const myJobRolesContent = (
    <div className="mt-4">
      <p className="text-sm text-gray-500 mb-8 font-medium">
        Set up your company&apos;s Job Titles by importing them from a template or create custom
        jobs. Assign each Job Title to its Department(s) while you create them or under Department
        Settings.
      </p>
      <MasterTable
        title="Job Titles"
        columns={roleColumns}
        dataSource={jobRoleMappedData}
        error={null}
        onAddClick={() => {
          setRoleToEdit(null);
          setIsAddEditRoleModalOpen(true);
        }}
        addButtonLabel="+ ADD JOB TITLE"
        filters={{
          searchPlaceholder: 'Search Job Titles...',
          filterOptions: [
            {
              label: 'All Sources',
              value: 'source',
              options: [
                { label: 'Template', value: 'inherited' },
                { label: 'Custom', value: 'custom' },
              ],
            },
            {
              label: 'All Statuses',
              value: 'status',
              options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ],
            },
          ],
          extraActions: (
            <Button
              className="px-5 text-sm rounded-full h-11 border border-gray-300 flex items-center gap-2 hover:bg-gray-50 bg-white"
              onClick={() => setIsImportRoleModalOpen(true)}
            >
              <DownloadOutlined /> Import from Template
            </Button>
          ),
        }}
        pagination={{
          current: rolePage + 1,
          pageSize: size,
          total: totalRoleElements,
          onPageChange: (p) => setRolePage(p - 1),
          onPageSizeChange: () => {},
        }}
        currentSortKey={currentRoleSortKey}
        onSort={handleRoleSort}
        onSearch={setRoleSearchText}
        onFilterChange={(filterKey, value) => {
          if (filterKey === 'source') {
            setRoleSource(value === '' ? 'all' : value);
            setRolePage(0);
          }
          if (filterKey === 'status') {
            setRoleStatus(value === '' ? 'all' : value);
            setRolePage(0);
          }
        }}
      />
    </div>
  );
  const mappedRoleIds = new Set(mappingJobTitlesData?.map((r) => r.id) || []);
  const allAvailableRoles = allJobRolesData?.content || [];

  const inheritedRoles = allAvailableRoles.filter((r) => r.source !== 'CUSTOM');
  const customRoles = allAvailableRoles.filter((r) => r.source === 'CUSTOM');

  // Local state for interacting with checkboxes before saving
  const [stagedMappedRoleIds, setStagedMappedRoleIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // When the department changes or backend mapped roles are fetched, reset the working stage state
    setStagedMappedRoleIds(new Set(mappedRoleIds));
  }, [mappingJobTitlesData, mappingDepartmentId]);

  const toggleRoleMapping = (roleId: number, checked: boolean) => {
    setStagedMappedRoleIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }
      return next;
    });
  };

  const getDepartmentNameById = (id: number | undefined) => {
    if (!id) return '';
    return departmentsData?.content?.find((d) => d.id === id)?.name || '';
  };

  const activeDepartmentName = getDepartmentNameById(mappingDepartmentId);

  const renderRoleCheckbox = (role: any) => {
    const isMapped = stagedMappedRoleIds.has(role.id);
    const isInactive = role.status !== 'ACTIVE';

    return (
      <div
        key={role.id}
        className={`flex items-center justify-between p-3 border rounded-lg mb-3 transition-colors ${
          isMapped
            ? isInactive
              ? 'border-gray-300 bg-gray-200'
              : 'border-blue-400 bg-blue-50/30'
            : isInactive
              ? 'border-gray-200 bg-gray-100'
              : 'border-gray-200 bg-white hover:bg-gray-50/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isMapped}
            onChange={(e) => toggleRoleMapping(role.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <span className={`text-sm ${isInactive ? 'text-gray-500' : 'text-gray-700'}`}>
            {role.name}
          </span>
        </div>

        {isInactive && (
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            Inactive
          </span>
        )}
      </div>
    );
  };

  const departmentRoleMapContent = (
    <div className="mt-4">
      <p className="text-sm text-gray-500 mb-8 font-medium">
        Assign active Job Titles (template or custom) to available Departments. You can assign a job
        to one or more departments.
      </p>
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
          <div className="w-64 relative">
            <Select
              appname="cfp"
              options={mappingDepartmentOptions}
              value={mappingDepartmentId ? String(mappingDepartmentId) : undefined}
              onChange={(value) => setMappingDepartmentId(Number(value))}
              placeholder="Select Department"
              className="h-11"
            />
          </div>
          {mappingDepartmentId && (
            <div className="w-72">
              <Input
                prefix={<SearchOutlined className="text-gray-400" />}
                placeholder="Search Job Titles..."
                className="w-full rounded-full h-11 text-sm bg-gray-50 border-transparent focus:bg-white"
                value={mappingSearchText}
                onChange={(e) => setMappingSearchText(e.target.value)}
              />
            </div>
          )}
        </div>
        {mappingDepartmentId && (
          <div className="text-sm text-gray-500">
            {stagedMappedRoleIds.size} Job Titles active for {activeDepartmentName}
          </div>
        )}
      </div>

      {mappingDepartmentId ? (
        <div className="animate-fade-in relative">
          {isMappingFetching && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <Loader />
            </div>
          )}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
              {activeDepartmentName} - Job Titles Configuration
            </h3>
          </div>

          <div className="flex gap-8">
            {/* Left Column - Inherited Roles */}
            <div className="flex-1">
              <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center mb-4">
                <span className="font-medium text-gray-800 text-sm">Job Titles (Template)</span>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  {inheritedRoles.filter((r) => stagedMappedRoleIds.has(r.id)).length} of{' '}
                  {inheritedRoles.length} selected
                </span>
              </div>
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {inheritedRoles.map(renderRoleCheckbox)}
                {inheritedRoles.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-lg">
                    No inherited roles found
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Custom Roles */}
            <div className="flex-1">
              <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center mb-4">
                <span className="font-medium text-gray-800 text-sm">Job Titles (Custom)</span>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  {customRoles.filter((r) => stagedMappedRoleIds.has(r.id)).length} of{' '}
                  {customRoles.length} selected
                </span>
              </div>
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {customRoles.map(renderRoleCheckbox)}
                {customRoles.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-lg">
                    No custom roles found
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-12 pt-6 border-t border-gray-100">
            <Button
              className="px-12 py-[10px] h-11 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setStagedMappedRoleIds(new Set(mappedRoleIds))}
              disabled={
                stagedMappedRoleIds.size === mappedRoleIds.size &&
                [...stagedMappedRoleIds].every((id) => mappedRoleIds.has(id))
              }
            >
              RESET
            </Button>
            <Button
              className="px-12 py-[10px] h-11 bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async () => {
                try {
                  await configureJobTitles({
                    departmentId: mappingDepartmentId!,
                    jobTitleIds: Array.from(stagedMappedRoleIds),
                  }).unwrap();
                  showToast({
                    type: 'success',
                    message: 'Job titles configuration saved successfully',
                  });
                } catch (error: any) {
                  const errorMessage =
                    error?.data?.message || 'Failed to save job titles configuration';
                  showToast({ type: 'error', message: errorMessage });
                }
              }}
              disabled={
                stagedMappedRoleIds.size === mappedRoleIds.size &&
                [...stagedMappedRoleIds].every((id) => mappedRoleIds.has(id))
              }
            >
              SAVE
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <VscOrganization className="text-4xl text-gray-300 mb-4" />
          <h3 className="text-gray-700 font-medium mb-1">No Department Selected</h3>
          <p className="text-gray-500 text-sm max-w-sm">
            Please pick a department from the dropdown above to manage its job titles configuration
          </p>
        </div>
      )}
    </div>
  );

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'Departments',
      children: myDepartmentsContent,
    },
    {
      key: '2',
      label: 'Job Titles',
      children: myJobRolesContent,
    },
    {
      key: '3',
      label: 'Department Settings',
      children: departmentRoleMapContent,
    },
  ];

  return (
    <div className="p-0">
      <div className="bg-gray-50 p-2 rounded-lg">
        <Tabs
          activeKey={currentSubTab}
          onChange={handleSubTabChange}
          items={items}
          type="card"
          className="[&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-content-holder]:bg-white [&_.ant-tabs-content-holder]:p-4 [&_.ant-tabs-content-holder]:rounded-b-lg"
        />
      </div>

      <ImportFromMasterModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSave={async (selectedIds) => {
          try {
            await importDepartments({ masterDepartmentIds: selectedIds }).unwrap();
            showToast({ type: 'success', message: 'Departments imported successfully' });
          } catch (error: any) {
            const errorMessage = error?.data?.message || 'Failed to import departments';
            showToast({ type: 'error', message: errorMessage });
          }
        }}
      />

      {contextHolder}

      <AddEditDepartmentModal
        open={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        initialData={departmentToEdit}
        onSave={async (data) => {
          try {
            const status = data.isActive ? 'ACTIVE' : 'INACTIVE';
            if (data.id) {
              await updateCustomDepartment({
                id: data.id,
                name: data.name,
                status,
              }).unwrap();
              showToast({ type: 'success', message: 'Department updated successfully' });
            } else {
              await addCustomDepartment({
                name: data.name,
                status,
              }).unwrap();
              showToast({ type: 'success', message: 'Department added successfully' });
            }
            setIsAddEditModalOpen(false);
            setDepartmentToEdit(null);
          } catch (error: any) {
            const errorMessage = error?.data?.message || 'Failed to save department';
            showToast({ type: 'error', message: errorMessage });
          }
        }}
      />

      <ImportRolesFromMasterModal
        open={isImportRoleModalOpen}
        onClose={() => setIsImportRoleModalOpen(false)}
        onSave={async (selectedIds, departmentId) => {
          try {
            await importJobRoles({ departmentId, masterJobTitleIds: selectedIds }).unwrap();
            showToast({ type: 'success', message: 'Job roles imported successfully' });
            setIsImportRoleModalOpen(false);
          } catch (error: any) {
            const errorMessage = error?.data?.message || 'Failed to import job roles';
            showToast({ type: 'error', message: errorMessage });
          }
        }}
      />

      <AddEditJobRoleModal
        open={isAddEditRoleModalOpen}
        onClose={() => setIsAddEditRoleModalOpen(false)}
        initialData={roleToEdit}
        onSave={async (data) => {
          try {
            if (data.id) {
              await updateCustomJobRole({
                id: data.id,
                name: data.name,
                status: data.isActive,
                departmentIds: data.departmentIds,
              }).unwrap();
              showToast({ type: 'success', message: 'Job role updated successfully' });
            } else {
              await addCustomJobRole({
                name: data.name,
                status: data.isActive,
                departmentIds: data.departmentIds,
              }).unwrap();
              showToast({ type: 'success', message: 'Job role created successfully' });
            }
            setIsAddEditRoleModalOpen(false);
          } catch (error: any) {
            const errorMessage =
              error?.data?.message || `Failed to ${data.id ? 'update' : 'create'} job role`;
            showToast({ type: 'error', message: errorMessage });
          }
        }}
      />
    </div>
  );
};

export default OrganizationModel;
