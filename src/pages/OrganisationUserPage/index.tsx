import { OrganisationUserTable } from '../../components';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const OrganisationUserPage = () => {
  return (
    <RequirePermission permission={Authorities.USER_VIEW}>
      <OrganisationUserTable />
    </RequirePermission>
  );
};

export default OrganisationUserPage;
