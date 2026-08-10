import { useMemo, useState } from 'react';
import { Button, Search, CommonCard, showToast } from '..';
import { Col, Dropdown, Row } from 'antd';
import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { MdOutlineAdminPanelSettings } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import MasterPagination from '../shared/ui/MasterPagination';
import MainLayout from '../../layouts/MainLayout';
import { Loader } from '../shared/ui/loader';
import { COL } from '../shared/ui/Columns';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import { RootState } from '../../redux/provider/store';
import { setRoleFilters } from '../../redux/slices/roleFilterSlice';
import { useListRolesQuery } from '../../api/rbac-service/Roles/listRoles';
import { useDeleteRoleMutation } from '../../api/rbac-service/Roles/deleteRole';
import useHasAccess from '../../hooks/useHasAccess';
import useRoleManagementContext from '../../hooks/useRoleManagementContext';
import { Authorities } from '../../constants/authorities.constant';
import type { Role } from '../../types';

const RolesManagement = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.RoleFilterSlice);
  const { scope, tenantId } = useRoleManagementContext();

  const canCreate = useHasAccess(Authorities.ROLE_CREATE);
  const canEdit = useHasAccess(Authorities.ROLE_EDIT);
  const canDelete = useHasAccess(Authorities.ROLE_DELETE);

  const { data, isFetching } = useListRolesQuery({
    scope,
    ...(scope === 'tenant' && tenantId ? { tenantId } : {}),
  });
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const filteredRoles = useMemo(() => {
    const all = data?.data || [];
    const query = filters.searchQuery.trim().toLowerCase();
    if (!query) return all;
    return all.filter((role) => role.roleName.toLowerCase().includes(query));
  }, [data, filters.searchQuery]);

  const total = filteredRoles.length;
  const page = filters.page;
  const size = filters.size || 10;
  const pageItems = filteredRoles.slice(page * size, page * size + size);

  const handleSearch = (query: string) => {
    dispatch(setRoleFilters({ searchQuery: query, page: 0 }));
  };

  const handlePageChange = (nextPage: number) => {
    dispatch(setRoleFilters({ page: nextPage }));
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRole({ roleId: roleToDelete.id }).unwrap();
      showToast({ message: `"${roleToDelete.roleName}" was deleted.`, type: 'success' });
    } catch (err: any) {
      showToast({
        message: err?.data?.message || 'Failed to delete role.',
        type: 'error',
      });
    } finally {
      setRoleToDelete(null);
    }
  };

  const renderActions = (role: Role) => (
    <Dropdown
      menu={{
        items: [
          {
            key: 'view',
            label: 'View',
            onClick: () => navigate(`/view-role?roleId=${role.id}`),
          },
          ...(canEdit && !role.isSystemRole
            ? [
                {
                  key: 'edit',
                  label: 'Edit',
                  onClick: () => navigate(`/edit-role?roleId=${role.id}`),
                },
              ]
            : []),
          ...(canDelete && !role.isSystemRole
            ? [
                {
                  key: 'delete',
                  label: 'Delete',
                  danger: true,
                  onClick: () => setRoleToDelete(role),
                },
              ]
            : []),
        ],
      }}
      trigger={['click']}
    >
      <MoreOutlined
        style={{ cursor: 'pointer', fontSize: 20 }}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );

  return (
    <div>
      <MainLayout>
        <div className="w-full p-8 justify-start pt-16">
          {(isFetching || isDeleting) && <Loader />}

          <div className="flex space-x-4 justify-between p-2">
            <div className="flex items-center space-x-2">
              <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                <MdOutlineAdminPanelSettings size={18} />
              </span>
              <h2 className="text-xl font-semibold">Roles &amp; Permissions</h2>
            </div>
            <div className="flex space-x-4">
              <Search
                appname="Role"
                placeholder="Search roles..."
                onSearch={handleSearch}
                allowClear
                value={filters.searchQuery}
              />
              {canCreate && (
                <Button
                  appname="invite user"
                  className="text-primary border border-primary rounded-3xl px-4 py-2 flex items-center space-x-2 max-h-10"
                  onClick={() => navigate('/invite-user')}
                >
                  <PlusOutlined className="text-lg" /> <span>INVITE USER</span>
                </Button>
              )}
              {canCreate && (
                <Button
                  appname="add role"
                  className="w-100% text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2 max-h-10"
                  onClick={() => navigate('/add-role')}
                >
                  <PlusOutlined className="text-lg" /> <span>CREATE ROLE</span>
                </Button>
              )}
            </div>
          </div>

          <div className="w-full">
            <div className="w-full py-2 justify-start">
              <Row
                gutter={[0, 16]}
                className="font-bold py-2 bg-[#FAFAFA] border border-[var(--border)] heading-font"
              >
                <COL
                  span={6}
                  xs={8}
                  sm={6}
                  md={6}
                  lg={6}
                  xl={6}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  ROLE NAME
                </COL>
                <COL
                  span={4}
                  xs={0}
                  sm={4}
                  md={4}
                  lg={4}
                  xl={4}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  SCOPE
                </COL>
                <COL
                  span={4}
                  xs={0}
                  sm={0}
                  md={4}
                  lg={4}
                  xl={4}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  PERMISSIONS
                </COL>
                <COL
                  span={5}
                  xs={0}
                  sm={0}
                  md={5}
                  lg={5}
                  xl={5}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  LOCATION OVERRIDES
                </COL>
                <COL
                  span={3}
                  xs={8}
                  sm={6}
                  md={3}
                  lg={3}
                  xl={3}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  TYPE
                </COL>
                <Col
                  span={2}
                  xs={8}
                  sm={8}
                  md={2}
                  lg={2}
                  xl={2}
                  className="py-2 px-3 flex items-center justify-end whitespace-nowrap"
                >
                  ACTIONS
                </Col>
              </Row>
            </div>

            <div className="w-full">
              {pageItems.length === 0 && !isFetching && (
                <div className="py-10 text-center text-gray-500">No roles found.</div>
              )}
              {pageItems.map((role) => (
                <div key={role.id} className="mb-2">
                  <CommonCard>
                    <Row gutter={[0, 16]} align="middle">
                      <COL span={6} xs={8} sm={6} md={6} lg={6} xl={6} className="px-3">
                        <span
                          className="font-semibold underline text-primary hover:text-primary roboto-font cursor-pointer"
                          onClick={() => navigate(`/view-role?roleId=${role.id}`)}
                        >
                          {role.roleName}
                        </span>
                      </COL>
                      <Col span={4} xs={0} sm={4} md={4} lg={4} xl={4} className="px-3">
                        <p className="roboto-font capitalize">{role.scope}</p>
                      </Col>
                      <Col span={4} xs={0} sm={0} md={4} lg={4} xl={4} className="px-3">
                        <p className="roboto-font">{role.permissions?.length ?? 0}</p>
                      </Col>
                      <Col span={5} xs={0} sm={0} md={5} lg={5} xl={5} className="px-3">
                        <p className="roboto-font">
                          {role.locationPermissions?.length
                            ? `${role.locationPermissions.length} location(s)`
                            : '—'}
                        </p>
                      </Col>
                      <Col span={3} xs={8} sm={6} md={3} lg={3} xl={3} className="px-3">
                        <p className="roboto-font">{role.isSystemRole ? 'System' : 'Custom'}</p>
                      </Col>
                      <Col
                        span={2}
                        xs={8}
                        sm={8}
                        md={2}
                        lg={2}
                        xl={2}
                        className="px-3 flex justify-end"
                      >
                        {renderActions(role)}
                      </Col>
                    </Row>
                  </CommonCard>
                </div>
              ))}
            </div>
          </div>

          <MasterPagination
            current={page + 1}
            pageSize={size}
            total={total}
            itemLabel="Roles"
            onPageChange={(nextPage) => handlePageChange(nextPage - 1)}
          />
        </div>
      </MainLayout>

      {roleToDelete && (
        <ConfirmationModal
          title={`Delete role "${roleToDelete.roleName}"? Anyone currently assigned it will lose these permissions.`}
          confirmText="DELETE"
          isLoading={isDeleting}
          onClose={() => setRoleToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default RolesManagement;
