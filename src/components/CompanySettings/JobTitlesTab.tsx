import React, { useState, useEffect } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { Button, showToast } from '../shared';
import {
  useGetMasterJobTitlesQuery,
  useAddMasterJobTitleMutation,
  useUpdateMasterJobTitleMutation,
  useDeleteMasterJobTitleMutation,
} from '../../api/tenant-service/CompanySettings/jobTitles';
import { useGetMasterDepartmentsQuery } from '../../api/tenant-service/CompanySettings/departments';
import { MasterTable } from '../shared/ui/MasterTable';
import type { SortDirection } from '../../types';
import AddEditJobTitleModal from './AddEditJobTitleModal';

const JobTitlesTab: React.FC = () => {
  const [modal, contextHolder] = Modal.useModal();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobTitleToEdit, setJobTitleToEdit] = useState<{
    id?: number;
    name: string;
    isActive: boolean;
    departmentIds: number[];
  } | null>(null);
  const [page, setPage] = useState(0);
  const size = 10;

  const [addJobTitle, { isLoading: isAdding }] = useAddMasterJobTitleMutation();
  const [updateJobTitle, { isLoading: isUpdating }] = useUpdateMasterJobTitleMutation();
  const [deleteJobTitle] = useDeleteMasterJobTitleMutation();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  const { data: deptData } = useGetMasterDepartmentsQuery({
    size: 200,
    status: 'active',
    sortBy: 'name',
    sortDirection: 'ASC',
  });
  const masterDepartments = deptData?.content || [];

  const { data } = useGetMasterJobTitlesQuery({
    page,
    size,
    search: debouncedSearch || undefined,
    departmentId: departmentFilter === 'all' ? undefined : departmentFilter,
    sortBy,
    sortDirection: sortDir,
  });

  const jobTitles = data?.content || [];
  const totalElements = data?.totalElements || 0;

  const currentSortKey = sortBy ? (sortDir === 'DESC' ? `-${sortBy}` : sortBy) : undefined;

  const handleSort = (key: string, direction: SortDirection): void => {
    setSortBy(direction ? key : 'name');
    setSortDir(direction === 'desc' ? 'DESC' : 'ASC');
  };

  const mapDepartmentIdsToNames = (deptIds: number[]): string => {
    if (!deptIds || deptIds.length === 0) return '-';
    return deptIds
      .map((id) => {
        const found = masterDepartments.find((d) => d.id === id);
        return found ? found.name : `Dept ${id}`;
      })
      .join(', ');
  };

  const tableData = jobTitles.map((jt) => ({
    key: jt.id.toString(),
    id: jt.id,
    name: jt.name,
    departmentsRaw: jt.departmentIds || [],
    departments: mapDepartmentIdsToNames(jt.departmentIds || []),
    status: jt.status,
  }));

  const getActionMenu = (record: any): MenuProps['items'] => [
    {
      key: '1',
      label: 'Edit',
      onClick: () => {
        setJobTitleToEdit({
          id: record.id,
          name: record.name,
          isActive: record.status,
          departmentIds: record.departmentsRaw,
        });
        setIsModalOpen(true);
      },
    },
    {
      key: '2',
      label: record.status ? 'Deactivate' : 'Activate',
      onClick: async () => {
        try {
          await updateJobTitle({
            jobTitleId: record.id,
            name: record.name,
            status: !record.status,
            departmentIds: record.departmentsRaw,
          }).unwrap();
          showToast({
            type: 'success',
            message: `Job Title ${record.status ? 'deactivated' : 'activated'} successfully`,
          });
        } catch (error: any) {
          showToast({
            type: 'error',
            message: error?.data?.message || 'Failed to update Job Title status',
          });
        }
      },
    },
    {
      key: '3',
      label: 'Delete',
      onClick: () => {
        modal.confirm({
          title: 'Delete Job Title',
          content: `Are you sure you want to delete "${record.name}"?`,
          okText: 'Delete',
          okType: 'danger',
          cancelText: 'Cancel',
          onOk: async () => {
            try {
              await deleteJobTitle(record.id).unwrap();
              showToast({ type: 'success', message: 'Job Title deleted successfully' });
            } catch (error: any) {
              showToast({
                type: 'error',
                message: error?.data?.message || 'Failed to delete Job Title',
              });
            }
          },
        });
      },
    },
  ];

  const columns = [
    {
      title: 'JOB TITLE',
      dataIndex: 'name',
      key: 'name',
      span: 8,
      sortKey: 'name',
      render: (text: string) => <span className="text-gray-700">{text}</span>,
    },
    {
      title: 'DEPARTMENTS',
      dataIndex: 'departments',
      key: 'departments',
      span: 8,
      sortKey: 'departments',
      render: (text: string) => <span className="text-gray-500 text-sm">{text}</span>,
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      span: 4,
      sortKey: 'status',
      render: (status: boolean) => (
        <span className={status ? 'text-green-600 font-medium' : 'text-gray-400 font-medium'}>
          {status ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      span: 4,
      render: (_: any, record: any) => (
        <Dropdown
          menu={{ items: getActionMenu(record) }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button className="p-1 border-none hover:bg-gray-100 bg-transparent text-gray-500 shadow-none h-auto w-auto flex items-center justify-center">
            <BsThreeDotsVertical style={{ fontSize: 16 }} />
          </Button>
        </Dropdown>
      ),
    },
  ];

  const departmentFilterOptions = [
    { label: 'All Departments', value: '' },
    ...masterDepartments.map((d) => ({ label: d.name, value: d.id.toString() })),
  ];

  return (
    <>
      <p className="text-sm text-gray-500 mb-8 font-medium">
        Global role vocabulary. Job Titles are neutral and reusable across multiple departments.
      </p>

      <MasterTable
        title="Job Titles"
        columns={columns}
        dataSource={tableData}
        error={null}
        onAddClick={() => {
          setJobTitleToEdit(null);
          setIsModalOpen(true);
        }}
        addButtonLabel="+ ADD JOB TITLE"
        filters={{
          searchPlaceholder: 'Search Job Titles...',
          filterOptions: [
            {
              label: 'All Departments',
              value: 'department',
              options: departmentFilterOptions,
            },
          ],
        }}
        pagination={{
          current: page + 1,
          pageSize: size,
          total: totalElements,
          onPageChange: (newPage) => setPage(newPage - 1),
          onPageSizeChange: () => {},
        }}
        currentSortKey={currentSortKey}
        onSort={handleSort}
        onSearch={setSearchText}
        onFilterChange={(filterKey, value) => {
          if (filterKey === 'department') {
            setDepartmentFilter(value === '' ? 'all' : Number(value));
            setPage(0);
          }
        }}
      />

      {contextHolder}

      <AddEditJobTitleModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={jobTitleToEdit}
        isLoading={isAdding || isUpdating}
        onSave={async (data) => {
          try {
            if (data.id) {
              await updateJobTitle({
                jobTitleId: data.id,
                name: data.name,
                status: data.isActive,
                departmentIds: data.departmentIds,
              }).unwrap();
              showToast({ type: 'success', message: 'Job Title updated successfully' });
            } else {
              await addJobTitle({
                name: data.name,
                status: data.isActive,
                departmentIds: data.departmentIds,
              }).unwrap();
              showToast({ type: 'success', message: 'Job Title added successfully' });
            }
            setIsModalOpen(false);
            setJobTitleToEdit(null);
          } catch (error: any) {
            showToast({
              type: 'error',
              message: error?.data?.message || `Failed to ${data.id ? 'update' : 'add'} Job Title`,
            });
          }
        }}
      />
    </>
  );
};

export default JobTitlesTab;
