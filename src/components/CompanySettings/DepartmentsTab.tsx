import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { TbBuilding } from 'react-icons/tb';
import { Button, showToast } from '../shared';
import {
  useGetMasterDepartmentsQuery,
  useAddMasterDepartmentMutation,
  useUpdateMasterDepartmentMutation,
  useDeleteMasterDepartmentMutation,
} from '../../api/tenant-service/CompanySettings/departments';
import { MasterTable } from '../shared/ui/MasterTable';
import AddEditDepartmentModal from './AddEditDepartmentModal';

const DepartmentsTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [modal, contextHolder] = Modal.useModal();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('ASC');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<{
    id?: number;
    name: string;
    isActive: boolean;
  } | null>(null);

  const [addDepartment, { isLoading: isAdding }] = useAddMasterDepartmentMutation();
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateMasterDepartmentMutation();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  const { data, isFetching } = useGetMasterDepartmentsQuery({
    page,
    size: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    sortBy: sortBy,
    sortDirection: sortDir,
  });

  const departments = data?.content || [];
  const totalElements = data?.totalElements || 0;

  const tableData = departments.map((dept) => ({
    key: dept.id.toString(),
    id: dept.id,
    name: dept.name,
    source: 'Custom',
    jobTitles: dept.jobTitleCount ?? 0,
    status: dept.status,
  }));

  const getActionMenu = (record: any): MenuProps['items'] => [
    {
      key: '1',
      label: 'Edit',
      onClick: () => {
        setDepartmentToEdit({ id: record.id, name: record.name, isActive: record.status });
        setIsModalOpen(true);
      },
    },
    {
      key: '2',
      label: record.status ? 'Deactivate' : 'Activate',
      onClick: async () => {
        try {
          await updateDepartment({
            id: record.id,
            name: record.name,
            status: !record.status,
          }).unwrap();
          showToast({
            type: 'success',
            message: `Department ${record.status ? 'deactivated' : 'activated'} successfully`,
          });
        } catch (error: any) {
          showToast({
            type: 'error',
            message: error?.data?.message || 'Failed to update department status',
          });
        }
      },
    },
    {
      key: '3',
      label: 'Settings',
      onClick: () => {
        searchParams.set('tab', '4');
        searchParams.set('deptId', record.id);
        setSearchParams(searchParams);
      },
    },
  ];

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
      render: (text: string) => <span className="text-blue-600 font-medium">{text}</span>,
    },
    {
      title: 'JOB TITLES',
      dataIndex: 'jobTitles',
      key: 'jobTitles',
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
        <div className="flex gap-4 items-center">
          <Dropdown
            menu={{ items: getActionMenu(record) }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button className="p-1 border-none hover:bg-gray-100 bg-transparent text-gray-500 shadow-none h-auto w-auto flex items-center justify-center">
              <BsThreeDotsVertical style={{ fontSize: 16 }} />
            </Button>
          </Dropdown>
        </div>
      ),
    },
  ];

  return (
    <>
      <p className="text-sm text-gray-500 mb-8 font-medium">
        Global list of functional organizational units. Departments are industry-agnostic here.
      </p>

      <MasterTable
        title="Departments"
        icon={<TbBuilding size={18} />}
        addButtonLabel="+ ADD DEPARTMENT"
        columns={columns}
        dataSource={tableData}
        error={null}
        onAddClick={() => {
          setDepartmentToEdit(null);
          setIsModalOpen(true);
        }}
        filters={{
          searchPlaceholder: 'Search Departments...',
          filterOptions: [
            {
              label: 'All Statuses',
              value: 'status',
              options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ],
            },
          ],
        }}
        pagination={{
          current: page + 1,
          pageSize: pageSize,
          total: totalElements,
          onPageChange: (newPage) => setPage(newPage - 1),
          onPageSizeChange: () => {
            // Not implementing page size change for now
          },
        }}
        onSearch={setSearchText}
        onFilterChange={(filterKey, value) => {
          if (filterKey === 'status') {
            setStatusFilter(value === '' ? 'all' : value);
          }
        }}
      />

      {contextHolder}

      <AddEditDepartmentModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={departmentToEdit}
        isLoading={isAdding || isUpdating}
        onSave={async (data) => {
          try {
            if (data.id) {
              await updateDepartment({
                id: data.id,
                name: data.name,
                status: data.isActive,
              }).unwrap();
              showToast({ type: 'success', message: 'Department updated successfully' });
            } else {
              await addDepartment({ name: data.name, status: data.isActive }).unwrap();
              showToast({ type: 'success', message: 'Department added successfully' });
            }
            setIsModalOpen(false);
            setDepartmentToEdit(null);
          } catch (error: any) {
            showToast({
              type: 'error',
              message: error?.data?.message || `Failed to ${data.id ? 'update' : 'add'} department`,
            });
          }
        }}
      />
    </>
  );
};

export default DepartmentsTab;
