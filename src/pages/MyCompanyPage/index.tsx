import MyCompany from '../../components/MyCompany';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const MyCompanyPage = () => {
  return (
    <RequirePermission permission={Authorities.COMPANY_SETTINGS_VIEW}>
      <MyCompany />
    </RequirePermission>
  );
};

export default MyCompanyPage;
