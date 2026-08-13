import { Navigate } from 'react-router-dom';

// Role editing has no backend endpoint yet — see RolesManagement/Index.tsx's
// "not available yet" note. Redirects rather than rendering the old
// rbac-service-mock form.
const EditRolePage = () => <Navigate to="/roles" replace />;

export default EditRolePage;
