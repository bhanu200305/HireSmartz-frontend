import { get } from 'lodash-es';
import { getLocalStorageItem } from '../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../constants/webAPI';
import { jwtDecode } from 'jwt-decode';

/**
 * Generic archive/unarchive handler for users and companies.
 *
 * This is a reusable helper that handles the complete archive workflow:
 * executes the mutation, shows appropriate toast notifications, and refreshes data.
 *
 * @param params - Archive operation parameters
 * @param params.type - Entity type: 'user' or 'company'
 * @param params.recordId - ID of the record to archive/unarchive
 * @param params.archiveFn - RTK Query mutation function (e.g., useArchiveUserMutation)
 * @param params.showToast - Toast notification function with signature (config: { message, type }) => void
 * @param params.refetch - Data refetch function to reload the list after archive
 * @param params.isArchived - Archive state (true = archive, false = unarchive)
 *
 * @throws Will catch errors and display error toast
 *
 * @example
 * const [archiveUser] = useArchiveUserMutation()
 * const { refetch } = useGetUsersQuery()
 *
 * await handleArchive({
 *   type: 'user',
 *   recordId: 123,
 *   archiveFn: archiveUser,
 *   showToast: toast,
 *   refetch,
 *   isArchived: true
 * })
 *
 * @flow
 * 1. Validate recordId is provided
 * 2. Build payload based on entity type:
 *    - user: { userId: recordId, isArchived }
 *    - company: { companyId: recordId, isArchived }
 * 3. Execute mutation function
 * 4. Show success toast with response message
 * 5. Refetch data to update UI
 * 6. Catch errors and show error toast with backend message
 */
export const handleArchive = async ({
  type,
  recordId,
  archiveFn,
  showToast,
  refetch,
  isArchived,
}: {
  type: string;
  recordId: number;
  archiveFn: Function;
  showToast: Function;
  refetch: Function;
  isArchived: boolean;
}) => {
  if (!recordId) return;
  const payload =
    type === 'user' ? { userId: recordId, isArchived } : { companyId: recordId, isArchived };
  try {
    const res = await archiveFn(payload).unwrap();
    showToast({
      message: get(res, 'message', 'User has been archived successfully'),
      type: 'success',
    });
    refetch();
  } catch (err) {
    showToast({
      message: get(err, 'data.message', 'Failed to archive user. Please try again.'),
      type: 'error',
    });
  }
};

/**
 * Generic resend invite handler for users and companies.
 *
 * Handles the invite resend workflow for both users and companies.
 * Sends invitation email and displays appropriate notifications.
 *
 * @param params - Resend invite parameters
 * @param params.type - Entity type: 'user' or 'company'
 * @param params.recordId - ID of user/company to send invite to
 * @param params.resendInviteFn - RTK Query mutation function
 * @param params.showToast - Toast notification function
 * @param params.refetch - Data refetch function
 * @param params.firstName - First name of user (for email personalization)
 * @param params.emailId - Email address to send invite to
 *
 * @throws Will catch errors and display error toast
 *
 * @example
 * const [resendInvite] = useResendInviteMutation()
 *
 * await handleResendInvite({
 *   type: 'user',
 *   recordId: 123,
 *   resendInviteFn: resendInvite,
 *   showToast: toast,
 *   refetch,
 *   firstName: 'John',
 *   emailId: 'john@example.com'
 * })
 */
export const handleResendInvite = async ({
  type,
  recordId,
  resendInviteFn,
  showToast,
  refetch,
  firstName,
  emailId,
}: {
  type: string;
  recordId: number;
  resendInviteFn: Function;
  showToast: Function;
  refetch: Function;
  firstName: string;
  emailId: string;
}) => {
  if (!recordId) return;
  const payload =
    type === 'user'
      ? { userId: recordId, firstName, emailId }
      : { companyId: recordId, firstName, emailId };
  try {
    const res = await resendInviteFn(payload).unwrap();
    showToast({
      message: get(res, 'message', 'User has been resent an invite successfully'),
      type: 'success',
    });
    refetch();
  } catch (err) {
    showToast({
      message: get(err, 'data.message', 'Failed to send invite. Please try again.'),
      type: 'error',
    });
  }
};
export const slotOptions = [
  { label: '15 mins', value: '15' },
  { label: '30 mins', value: '30' },
  { label: '45 mins', value: '45' },
  { label: '1 hr', value: '60' },
];

const matchMarkdownHeader = (_: any, hashes: string, char: string) => {
  return hashes + (char === ' ' ? '' : ' ') + char;
};

export const formatMarkdownResponse = (response: string) => {
  return response
    .replace(/^( )+/gm, '')
    .replace(/(###)([^\s#])/g, matchMarkdownHeader)
    .replace(/(##)([^\s#])/g, matchMarkdownHeader)
    .replace(/(#)([^\s#])/g, matchMarkdownHeader);
};

export const roundTypeOptions = [
  { label: 'Completed', value: 'INTERVIEW_COMPLETED' },
  { label: 'No Show', value: 'NO_SHOW' },
];

export const yearlyOptions = [
  { label: 2025, value: 2025 },
  { label: 2026, value: 2026 },
  { label: 2027, value: 2027 },
  { label: 2028, value: 2028 },
  { label: 2029, value: 2029 },
];

export const monthlyOptions = [
  { label: 'Jan', value: 1 },
  { label: 'Feb', value: 2 },
  { label: 'Mar', value: 3 },
  { label: 'Apr', value: 4 },
  { label: 'May', value: 5 },
  { label: 'Jun', value: 6 },
  { label: 'Jul', value: 7 },
  { label: 'Aug', value: 8 },
  { label: 'Sep', value: 9 },
  { label: 'Oct', value: 10 },
  { label: 'Nov', value: 11 },
  { label: 'Dec', value: 12 },
];

export const verifyAuthToken = () => {
  const accessToken = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
  if (!accessToken) {
    return false;
  }
  const decodedToken = jwtDecode<{ exp: number }>(accessToken);
  if (decodedToken.exp <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  return true;
};

export const sanitizeImagePreview = (imagePreview: string) => {
  return typeof imagePreview === 'string' &&
    /^(data:image\/(png|jpeg|jpg);base64,|blob:|https?:\/\/)/.test(imagePreview)
    ? imagePreview
    : '';
};

export const sanitizedPath = (path: string): string => {
  try {
    if (!path || typeof path !== 'string') return window.location.host + '/';

    const decoded = decodeURIComponent(path.trim());

    if (decoded.startsWith('/') && !decoded.startsWith('//')) {
      return decoded;
    }

    return '/';
  } catch {
    return '/';
  }
};
