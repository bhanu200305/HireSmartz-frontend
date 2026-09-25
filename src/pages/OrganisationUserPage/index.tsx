import { useSelector } from 'react-redux';
import { OrganisationUserTable } from '../../components';
import CfpUsers from '../../components/CfpUsers';
import RequirePermission from '../../components/RequirePermission';
import MainLayout from '../../layouts/MainLayout';
import { Authorities } from '../../constants/authorities.constant';
import useHasAccess from '../../hooks/useHasAccess';
import { RootState } from '../../redux/provider/store';

// The Users tab covers two audiences that never overlap: a tenant's own
// directory (OrganisationUserTable, needs a tenant_id) and Careerforce Pro's
// internal team (CfpUsers, platform staff with no tenant_id — see its own
// comment). Each section only renders for the audience it applies to, so a
// platform admin isn't shown a permanently-empty tenant user list, and a
// tenant admin isn't shown a section they have no permission for anyway.
const OrganisationUserPage = () => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const hasTenantUsersAccess = useHasAccess(Authorities.USER_VIEW);
  const hasCfpUsersAccess = useHasAccess(Authorities.PLATFORM_VIEW);

  return (
    <RequirePermission permission={[Authorities.USER_VIEW, Authorities.PLATFORM_VIEW]}>
      <MainLayout>
        <div className="w-full p-8 pt-16 flex flex-col gap-10">
          {hasTenantUsersAccess && tenantId && <OrganisationUserTable />}
          {hasCfpUsersAccess && <CfpUsers />}
        </div>
      </MainLayout>
    </RequirePermission>
  );
};

export default OrganisationUserPage;
