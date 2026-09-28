import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs } from 'antd';
import { MdOutlineAdminPanelSettings, MdOutlineArrowBack } from 'react-icons/md';
import { FaPlus } from 'react-icons/fa';
import MainLayout from '../../layouts/MainLayout';
import { RootState } from '../../redux/provider/store';
import { Authorities } from '../../constants/authorities.constant';
import useEffectivePermissions from '../../hooks/useEffectivePermissions';
import { useRolesCatalog } from '../../hooks/useRolesCatalog';
import { isMasterSuperAdminRole } from '../../shared/utils/auth/permission.helpers';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import { Loader } from '../shared/ui/loader';
import { useListTenantOfficesQuery } from '../../api/organization-service/Tenants/offices';
import RoleContextSwitcher from './RoleContextSwitcher';
import RoleTable from './RoleTable';
import CreateRoleModal from './CreateRoleModal';
import EditRoleModal from './EditRoleModal';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
// import PermissionReferenceTab from './PermissionExplorer/PermissionReferenceTab'; // Temporarily disabled — see tabItems below.
import type { RoleManagementContext } from './types';
import type { Role } from '../../types';

const DEFAULT_TAB = 'roles';

/**
 * Backed by the real organization-service RBAC endpoints via
 * useRolesCatalog (api/organization-service/Roles/roles.ts) — this
 * component tree only ever talks to that hook's shape, never the network
 * directly, which is what let the backend catch up without any changes
 * here beyond passing `isMaster` through and using real office ids.
 */
const RolesManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || DEFAULT_TAB;
  const session = useSelector((state: RootState) => state.LoginSlice);
  const effectivePermissions = useEffectivePermissions();
  const isMaster = isMasterSuperAdminRole(session.role);

  const [switcherContext, setSwitcherContext] = useState<RoleManagementContext>({
    scope: 'platform',
  });

  // Non-Master-Super-Admin sessions are always scoped to their own tier —
  // owner-type sessions (Master/Admin/User) see the CFP platform catalog,
  // organization-type sessions see their own tenant's catalog. Only Master
  // Super Admin can locally switch this via RoleContextSwitcher above.
  const context: RoleManagementContext = isMaster
    ? switcherContext
    : session.role.type === 'organization'
      ? { scope: 'tenant', tenantId: session.tenantId ?? undefined }
      : { scope: 'platform' };

  const {
    roles,
    isLoading: rolesLoading,
    error: rolesError,
    createRole,
    updateRole,
    deleteRole,
  } = useRolesCatalog({
    scope: context.scope,
    tenantId: context.tenantId,
    isMaster,
  });

  const { data: offices } = useListTenantOfficesQuery(
    { tenantId: context.tenantId ?? '', isMaster },
    { skip: !context.tenantId }
  );
  const availableLocations = useMemo(
    () =>
      (offices ?? []).map((office) => ({
        // Real office_id (UUID) — PUT .../permissions needs this exact id
        // as location_id for an override to resolve to anything server-side.
        id: office.office_id,
        // City/state alone isn't unique — a tenant with two offices in the
        // same city needs the street address to tell them apart when setting
        // DIFFERENT per-location permissions here (recall: two Mohali
        // offices both showing "Mohali" made it impossible to tell which one
        // was being edited). Matches the convention RoleLocationPicker uses.
        name: `${office.city}, ${office.address_line_1}`,
      })),
    [offices]
  );

  const systemRoles = useMemo(() => roles.filter((role) => role.isSystemRole), [roles]);
  const customRoles = useMemo(() => roles.filter((role) => !role.isSystemRole), [roles]);

  const canCreate = effectivePermissions.includes(Authorities.ROLE_CREATE);
  const canEdit = effectivePermissions.includes(Authorities.ROLE_EDIT);
  const canDelete = effectivePermissions.includes(Authorities.ROLE_DELETE);

  const [createOpen, setCreateOpen] = useState(false);
  const [roleBeingEdited, setRoleBeingEdited] = useState<Role | null>(null);
  const [roleBeingDeleted, setRoleBeingDeleted] = useState<Role | null>(null);

  const handleConfirmDelete = async () => {
    if (!roleBeingDeleted) return;
    await deleteRole(roleBeingDeleted.id);
    setRoleBeingDeleted(null);
  };

  // Master Super Admin picked "a client organization" but hasn't chosen a
  // company yet — nothing to show or act on until one is selected.
  const awaitingCompanySelection = isMaster && context.scope === 'tenant' && !context.tenantId;

  // "Who has this permission" / "what can this person do" lookups inside the
  // Permission Reference tab only ever apply to a COMPANY's users — never
  // CFP's own internal (platform) roles, and never before a Super Admin has
  // actually picked which company they mean. A Company Admin session always
  // satisfies this the moment `context` above resolves (their own tenant,
  // from their token — no picker needed).
  // Unused while the Permission Reference tab (below) is commented out.
  // const canLookupCompany = context.scope === 'tenant' && Boolean(context.tenantId);

  const handleTabChange = (key: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', key);
      return next;
    });
  };

  const rolesTabContent = awaitingCompanySelection ? (
    <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
      <p className="text-sm text-gray-500">Select a company above to manage its role catalog.</p>
    </div>
  ) : rolesLoading ? (
    <div className="py-16 flex items-center justify-center">
      <Loader />
    </div>
  ) : rolesError ? (
    <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
      <p className="text-sm text-danger-solid">
        {getOrgErrorMessage(rolesError, 'Failed to load roles.')}
      </p>
    </div>
  ) : (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          System Roles
          <span className="ml-2 text-xs font-normal text-gray-400">
            {systemRoles.length} built-in, non-editable
          </span>
        </h3>
        {systemRoles.length > 0 ? (
          <RoleTable
            roles={systemRoles}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={setRoleBeingEdited}
            onDelete={setRoleBeingDeleted}
            hideTypeColumn
          />
        ) : (
          <div className="py-8 flex items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-500">No system roles for this scope.</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Custom Roles
          <span className="ml-2 text-xs font-normal text-gray-400">
            {customRoles.length} created for this scope
          </span>
        </h3>
        {customRoles.length > 0 ? (
          <RoleTable
            roles={customRoles}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={setRoleBeingEdited}
            onDelete={setRoleBeingDeleted}
            hideTypeColumn
            roleColumnLabel="Designation"
            showBaseRole
          />
        ) : (
          <div className="py-8 flex items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-500">
              No custom roles yet. Create one with the button above.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const tabItems = [
    { key: 'roles', label: 'Roles', children: rolesTabContent },
    // Temporarily disabled — the category/description backend gap on
    // GET /v1/roles/permissions needs a real fix first. Re-enable by
    // uncommenting this entry once that's sorted.
    // {
    //   key: 'reference',
    //   label: 'Permission Reference',
    //   children: (
    //     <PermissionReferenceTab
    //       isMaster={isMaster}
    //       tenantId={context.tenantId}
    //       canLookupCompany={canLookupCompany}
    //     />
    //   ),
    // },
  ];

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex w-fit items-center text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back</span>
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-2.5">
            <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
              <MdOutlineAdminPanelSettings size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold leading-tight">Roles &amp; Permissions</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                8 built-in templates · create custom roles with location-specific overrides
              </p>
            </div>
          </div>

          {activeTab === 'roles' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                disabled={!canCreate || awaitingCompanySelection}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-primary-600 rounded-full px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <FaPlus size={11} /> Custom Role
              </button>
            </div>
          )}
        </div>

        {isMaster && (
          <RoleContextSwitcher context={switcherContext} onChange={setSwitcherContext} />
        )}

        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} />
      </div>

      <CreateRoleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        scope={context.scope}
        tenantId={context.tenantId}
        availableLocations={availableLocations}
        roles={roles}
        onCreate={createRole}
      />

      <EditRoleModal
        role={roleBeingEdited}
        onClose={() => setRoleBeingEdited(null)}
        availableLocations={availableLocations}
        onSave={updateRole}
      />

      {roleBeingDeleted && (
        <ConfirmationModal
          title={`Delete "${roleBeingDeleted.roleName}"? This can't be undone.`}
          confirmText="DELETE"
          onConfirm={handleConfirmDelete}
          onClose={() => setRoleBeingDeleted(null)}
        />
      )}
    </MainLayout>
  );
};

export default RolesManagement;
