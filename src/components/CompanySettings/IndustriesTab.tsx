import React, { useState, useEffect } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { Button, showToast } from '../shared';
import {
  useGetMasterIndustriesQuery,
  useAddMasterIndustryMutation,
  useUpdateMasterIndustryMutation,
} from '../../api/tenant-service/CompanySettings/industries';
import { MasterTable } from '../shared/ui/MasterTable';
import type { SortDirection } from '../../types';
import AddEditIndustryModal from './AddEditIndustryModal';

const IndustriesTab: React.FC = () => {
  const [, contextHolder] = Modal.useModal();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [industryToEdit, setIndustryToEdit] = useState<{
    id?: number;
    name: string;
    isActive: boolean;
  } | null>(null);
  const [page, setPage] = useState(0);
  const size = 10;

  const [addIndustry, { isLoading: isAdding }] = useAddMasterIndustryMutation();
  const [updateIndustry, { isLoading: isUpdating }] = useUpdateMasterIndustryMutation();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  const { data } = useGetMasterIndustriesQuery({
    page,
    size,
    search: debouncedSearch || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    sortBy,
    sortDirection: sortDir,
  });

  const industries = data?.content || [];
  const totalElements = data?.totalElements || 0;

  const currentSortKey = sortBy ? (sortDir === 'DESC' ? `-${sortBy}` : sortBy) : undefined;

  const handleSort = (key: string, direction: SortDirection): void => {
    setSortBy(direction ? key : 'name');
    setSortDir(direction === 'desc' ? 'DESC' : 'ASC');
  };

  const tableData = industries.map((ind) => ({
    key: ind.id.toString(),
    id: ind.id,
    name: ind.name,
    companies: ind.companyCount || 0,
    status: ind.status,
  }));

  const getActionMenu = (record: any): MenuProps['items'] => [
    {
      key: '1',
      label: 'Edit',
      onClick: () => {
        setIndustryToEdit({ id: record.id, name: record.name, isActive: record.status });
        setIsModalOpen(true);
      },
    },
    {
      key: '2',
      label: record.status ? 'Deactivate' : 'Activate',
      onClick: async () => {
        try {
          await updateIndustry({
            id: record.id,
            name: record.name,
            status: !record.status,
          }).unwrap();
          showToast({
            type: 'success',
            message: `Industry ${record.status ? 'deactivated' : 'activated'} successfully`,
          });
        } catch (error: any) {
          showToast({
            type: 'error',
            message: error?.data?.message || 'Failed to update industry status',
          });
        }
      },
    },
  ];

  const columns = [
    {
      title: 'INDUSTRIES',
      dataIndex: 'name',
      key: 'name',
      span: 10,
      sortKey: 'name',
      render: (text: string) => <span className="text-gray-700">{text}</span>,
    },
    {
      title: 'COMPANIES',
      dataIndex: 'companies',
      key: 'companies',
      span: 6,
      sortKey: 'companyCount',
      render: (count: number) => <span className="text-gray-500">{count}</span>,
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

  return (
    <>
      <p className="text-sm text-gray-500 mb-8 font-medium">
        Define the top-level business verticals. Industry is assigned to a company at creation and
        cannot be changed later.
      </p>

      <MasterTable
        title="Industries"
        columns={columns}
        dataSource={tableData}
        error={null}
        onAddClick={() => {
          setIndustryToEdit(null);
          setIsModalOpen(true);
        }}
        addButtonLabel="+ ADD INDUSTRY"
        filters={{
          searchPlaceholder: 'Search Industries...',
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
          pageSize: size,
          total: totalElements,
          onPageChange: (newPage) => setPage(newPage - 1),
          onPageSizeChange: () => {},
        }}
        currentSortKey={currentSortKey}
        onSort={handleSort}
        onSearch={setSearchText}
        onFilterChange={(filterKey, value) => {
          if (filterKey === 'status') setStatusFilter(value === '' ? 'all' : value);
        }}
      />

      {contextHolder}

      <AddEditIndustryModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={industryToEdit}
        isLoading={isAdding || isUpdating}
        onSave={async (data) => {
          try {
            if (data.id) {
              await updateIndustry({
                id: data.id,
                name: data.name,
                status: data.isActive,
              }).unwrap();
              showToast({ type: 'success', message: 'Industry updated successfully' });
            } else {
              await addIndustry({ name: data.name, status: data.isActive }).unwrap();
              showToast({ type: 'success', message: 'Industry added successfully' });
            }
            setIsModalOpen(false);
            setIndustryToEdit(null);
          } catch (error: any) {
            showToast({
              type: 'error',
              message: error?.data?.message || `Failed to ${data.id ? 'update' : 'add'} industry`,
            });
          }
        }}
      />
    </>
  );
};

export default IndustriesTab;
