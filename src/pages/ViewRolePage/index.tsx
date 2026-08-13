import { Navigate } from 'react-router-dom';

// No GET-by-id endpoint for a role exists yet — see RolesManagement/Index.tsx's
// "not available yet" note. Redirects rather than rendering the old
// rbac-service-mock view. A user's own effective permissions are real and
// viewable from their profile page instead.
const ViewRolePage = () => <Navigate to="/roles" replace />;

export default ViewRolePage;
