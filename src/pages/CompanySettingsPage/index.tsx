import CompanySettings from '../../components/CompanySettings';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const CompanySettingsPage = () => {
  return (
    <RequirePermission permission={Authorities.INDUSTRY_VIEW}>
      <CompanySettings />
    </RequirePermission>
  );
};

export default CompanySettingsPage;
