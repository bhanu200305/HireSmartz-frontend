import MyCompany from '../../components/MyCompany';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

// Same OR-condition Sidebar/Navbar use to show the "Company" nav item.
const ALLOWED_PERMISSIONS = [
  Authorities.COMPANY_SETTINGS_EDIT,
  Authorities.JOB_CATALOG_EDIT,
  Authorities.DEPARTMENT_ADD,
  Authorities.DEPARTMENT_EDIT,
  Authorities.DEPARTMENT_DELETE,
  Authorities.TENANT_JOB_TITLE_ADD,
  Authorities.TENANT_JOB_TITLE_EDIT,
  Authorities.TENANT_JOB_TITLE_DELETE,
];

const MyCompanyPage = () => {
  return (
    <RequirePermission permission={ALLOWED_PERMISSIONS}>
      <MyCompany />
    </RequirePermission>
  );
};

export default MyCompanyPage;
