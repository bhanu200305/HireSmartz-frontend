import { MdOutlineAdminPanelSettings } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { Button, Typography } from '..';

/**
 * organization-service's RBAC surface today is deliberately narrow (see
 * RBAC_API.md): `POST /v1/roles/assignments` (grant), `DELETE
 * /v1/roles/assignments/{id}` (revoke), and `GET
 * /v1/roles/users/{user_id}/permissions` (resolve) — the domain has
 * `Role.create_for_tenant`/`.grant`/`.revoke`/`.replace_permissions` fully
 * built, but no route calls any of them, and there is no "list roles"
 * endpoint anywhere in the service either. A role browser/CRUD screen has
 * no real data to show and nothing to call — this used to render a mock
 * role list (`api/rbac-service/**`), which would now be actively
 * misleading rather than "not wired up yet". Kept as an honest empty state
 * instead. A user's OWN effective permissions are real and viewable today
 * — see a user's profile page.
 */
const RolesManagement = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <div className="flex items-center space-x-2 mb-6">
          <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
            <MdOutlineAdminPanelSettings size={18} />
          </span>
          <h2 className="text-xl font-semibold">Roles &amp; Permissions</h2>
        </div>

        <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <Typography variant="h6" className="mb-2 block">
            Role management isn&apos;t available yet
          </Typography>
          <Typography variant="body2" className="max-w-md mb-6">
            The platform can grant and revoke a role for a specific person today, but it
            doesn&apos;t yet expose a way to browse, create, or edit roles themselves. To see what
            someone can currently do, open their user profile.
          </Typography>
          <Button
            appname="go to users"
            className="text-white bg-button rounded-3xl px-5 py-2"
            onClick={() => navigate('/organisation-users')}
          >
            Go to Users
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default RolesManagement;
