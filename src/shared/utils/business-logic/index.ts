import { get } from 'lodash-es';
import { getLocalStorageItem, setTokens } from '../auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';
import { jwtDecode } from 'jwt-decode';
import { isDevAuthBypassEnabled, ensureDevBypassTokens } from '../auth/devAuthBypass';

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
  extraPayload,
}: {
  type: string;
  recordId: number;
  archiveFn: Function;
  showToast: Function;
  refetch: Function;
  isArchived: boolean;
  extraPayload?: Record<string, unknown>;
}) => {
  if (!recordId) return;
  const payload =
    type === 'user'
      ? { userId: recordId, isArchived, ...extraPayload }
      : { companyId: recordId, isArchived, ...extraPayload };
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
  extraPayload,
}: {
  type: string;
  recordId: number;
  resendInviteFn: Function;
  showToast: Function;
  refetch: Function;
  firstName: string;
  emailId: string;
  extraPayload?: Record<string, unknown>;
}) => {
  if (!recordId) return;
  const payload =
    type === 'user'
      ? { userId: recordId, firstName, emailId, ...extraPayload }
      : { companyId: recordId, firstName, emailId, ...extraPayload };
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

/**
 * Formats plain text AI-generated job descriptions into markdown format.
 * Converts section headers, manages list items, and ensures proper spacing.
 *
 * @param text - Plain text job description from AI
 * @returns Formatted markdown string
 *
 * @example
 * formatAiJobDescription("Department: HR\nResponsibilities\nManage team\nCoordinate meetings")
 * // Returns: "## Department\nHR\n\n## Responsibilities\n- Manage team\n- Coordinate meetings"
 */
export const formatAiJobDescription = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  // Section headers that should be converted to markdown headings
  const sectionHeaders = [
    'About the Role',
    'Responsibilities',
    'Required Skills',
    'Optional Skills',
    'Education Preference',
    'Education',
    'Experience',
    'Salary Information',
    'Communication Language',
    'Department',
    'Job Type',
    'Location',
    'Exemption Status',
    'Minimum Salary',
    'Maximum Salary',
    'Referral Bonus',
    'Minimum Experience',
    'Maximum Experience',
  ];

  const formatted = text;

  // Split by lines and process
  const lines = formatted.split('\n');
  const processedLines: string[] = [];
  let inListSection = false;
  let lastWasEmptyLine = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      if (!lastWasEmptyLine) {
        processedLines.push('');
        lastWasEmptyLine = true;
      }
      continue;
    }

    lastWasEmptyLine = false;

    // Check if line is a section header
    const isSectionHeader = sectionHeaders.some(
      (header) => line === header || line.startsWith(header + ':')
    );

    if (isSectionHeader) {
      // Add empty line before section if not first item
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }

      // Convert to markdown heading
      const headerText = line.replace(/:\s*$/, ''); // Remove trailing colon if present
      processedLines.push(`## ${headerText}`);
      inListSection = true;
      continue;
    }

    // Check if it looks like a key-value pair (e.g., "Department: HR")
    if (
      line.includes(':') &&
      !line.startsWith('-') &&
      !line.startsWith('*') &&
      !line.startsWith('#')
    ) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      // If value is on same line, format as key-value
      if (value) {
        processedLines.push(`**${key.trim()}:** ${value}`);
        inListSection = false;
      } else {
        processedLines.push(line);
      }
    } else if (inListSection && line && !line.startsWith('-') && !line.startsWith('*')) {
      // Convert lines in list sections to bullet points if not already
      if (!line.match(/^[\d.]+\s/)) {
        processedLines.push(`- ${line}`);
      } else {
        processedLines.push(line);
      }
    } else {
      processedLines.push(line);
    }
  }

  // Join and clean up
  let result = processedLines.join('\n');

  // Ensure proper spacing between sections
  result = result.replace(/\n\n+/g, '\n\n');

  // Format the markdown headers properly
  result = result
    .replace(/^( )+/gm, '')
    .replace(/(###)([^\s#])/g, matchMarkdownHeader)
    .replace(/(####)([^\s#])/g, matchMarkdownHeader)
    .replace(/(##)([^\s#])/g, matchMarkdownHeader)
    .replace(/(#)([^\s#])/g, matchMarkdownHeader);

  return result;
};

export const formatMarkdownResponse = (response: string) => {
  return response
    .replace(/^( )+/gm, '')
    .replace(/(###)([^\s#])/g, matchMarkdownHeader)
    .replace(/(##)([^\s#])/g, matchMarkdownHeader)
    .replace(/(#)([^\s#])/g, matchMarkdownHeader);
};

export const roundTypeOptions = [
  { label: 'Completed', value: 'COMPLETED' },
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
  // DEV-ONLY: backend login isn't ready yet. See src/shared/utils/auth/devAuthBypass.ts
  // and set VITE_BYPASS_AUTH=true in .env.local to skip real token validation.
  if (isDevAuthBypassEnabled()) {
    ensureDevBypassTokens(getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS), setTokens);
    return true;
  }

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

export const isMultiLocationRoleName = (roleName?: string): boolean => {
  const normalized = roleName?.toLowerCase();
  return (
    normalized === 'recruiter' || normalized === 'hiring manager' || normalized === 'super admin'
  );
};

export const isHMOrRecruiter = (roleName?: string): boolean => {
  const normalizedRoleName = roleName?.toLowerCase();
  return normalizedRoleName === 'recruiter' || normalizedRoleName === 'hiring manager';
};
