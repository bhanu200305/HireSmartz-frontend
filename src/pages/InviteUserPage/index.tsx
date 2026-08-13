import { Navigate } from 'react-router-dom';

// This flow depended on rbac-service's mock role catalog
// (`api/rbac-service/Roles/listRoles`), which has no real backend
// equivalent — see RolesManagement/Index.tsx's "not available yet" note.
// RolesManagement no longer links here; redirect rather than render a page
// whose role dropdown calls a nonexistent endpoint.
const InviteUserPage = () => <Navigate to="/roles" replace />;

export default InviteUserPage;
