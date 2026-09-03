import { get } from 'lodash-es';
import { getLocalStorageItem, removeLocalStorageItem } from '../auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';
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

// Leading glyph pypdf/docx text extraction commonly emits for a list item —
// sometimes stranded on its own line, separate from the item's actual text
// (reportlab-style PDFs especially split the bullet glyph and the paragraph
// into different content-stream operations, which pypdf then reads back as
// two lines instead of one).
//
// The glyph must be followed by real whitespace or be alone on the line —
// NOT by another non-space character. Without that guard, `\s*` (zero-or-
// more) happily matches a bare leading `*` with nothing after it, which
// also fires on `**bold**`/`*italic*` lines (AI-authored JDs use both
// constantly): `**Key Responsibilities**` would get misread as a stray "*"
// bullet glyph and have only its first asterisk stripped, leaving a
// mismatched `- *Key Responsibilities**` that renders as literal asterisks
// instead of bold text.
const AI_JD_BULLET_RE = /^[•●◦‣▪∙*-](?:\s+|$)/;
const AI_JD_NUMBERED_RE = /^\d+[.)]\s+/;
const AI_JD_MARKDOWN_HEADING_RE = /^#{1,6}\s+/;

// A whole line already bold, e.g. "**Position Overview:**" — promoted
// straight to a heading instead of being re-wrapped by the key:value branch.
const AI_JD_WHOLE_LINE_BOLD_RE = /^\*\*(.+)\*\*$/;

// Keyword stem list for heading detection — deliberately stems ("responsibilit"
// not "responsibilities") so it matches whatever wording the source actually
// used ("Responsibilities", "Key Responsibilities", "Required Skills
// (Must-Have)", "Other Requirements", ...) instead of requiring an exact
// string match against one fixed phrase per section.
const AI_JD_HEADING_KEYWORD_RE =
  /(about\s+the\s+role|role\s+summary|responsibilit|requirement|qualification|skill|experience|salary|compensation|education|department|job\s*type|location|benefit|perk|what\s+we\s+offer|nice.to.have|preferred|other|communication|referral|exemption|vacanc|headcount|shift|mode)/i;

/** A bare (no markdown syntax) line that reads like a section label rather
 * than prose — short, doesn't trail off mid-sentence, and either matches a
 * common JD-section keyword or is mostly Title Case. */
const isLikelyAiJdHeading = (line: string): boolean => {
  if (!line || AI_JD_BULLET_RE.test(line) || AI_JD_NUMBERED_RE.test(line)) return false;
  if (/[.,;]$/.test(line)) return false; // ends mid-sentence — prose, not a label
  if (line.length > 60) return false; // headings read short

  const withoutColon = line.replace(/:\s*$/, '');
  if (AI_JD_HEADING_KEYWORD_RE.test(withoutColon)) return true;

  const words = withoutColon.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 8) return false;
  const capitalizedWords = words.filter((w) => /^[A-Z(]/.test(w));
  return capitalizedWords.length / words.length >= 0.7;
};

/**
 * Formats a job description's raw text into markdown, for both AI-authored
 * text (job.jd.generate/enhance — usually already fairly clean, sometimes
 * genuine markdown) and a plain-text upload extraction (job.jd.parse —
 * pypdf/python-docx's verbatim, un-reformatted read of the source file,
 * complete with mid-sentence line wraps and bullet glyphs that landed on
 * their own line). Lines already written as markdown (`# `, `- `, `1. `)
 * pass through untouched; bare lines are heuristically promoted to headings
 * or bullets, and a bare line that doesn't look like a heading is merged
 * into the previous bullet instead of becoming a bullet of its own whenever
 * that previous line was cut off mid-sentence (no trailing `.`/`!`/`?`/`:`)
 * — the actual signature of a hard line-wrap versus a genuine next item.
 *
 * @param text - Raw job description text (AI-authored or extracted from an
 * uploaded file)
 * @returns Formatted markdown string
 */
export const formatAiJobDescription = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  // Strip whitespace right inside "**" pairs — CommonMark won't render bold
  // otherwise (e.g. "**Position Overview: **" stays literal).
  const normalizedText = text.replace(/\*\*\s+/g, '**').replace(/\s+\*\*/g, '**');

  const rawLines = normalizedText.split('\n').map((line) => line.trim());

  // Pass 1: a bullet glyph stranded alone on its own line (see
  // AI_JD_BULLET_RE above) isn't a list item by itself — fold it into
  // whichever following line actually carries the item's text, dropping it
  // entirely if nothing usable follows.
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (AI_JD_BULLET_RE.test(line) && line.replace(AI_JD_BULLET_RE, '').trim() === '') {
      let j = i + 1;
      while (j < rawLines.length && rawLines[j] === '') j++;
      const next = j < rawLines.length ? rawLines[j] : '';
      if (
        next &&
        !AI_JD_BULLET_RE.test(next) &&
        !AI_JD_NUMBERED_RE.test(next) &&
        !isLikelyAiJdHeading(next)
      ) {
        lines.push(`- ${next}`);
        i = j;
      }
      continue;
    }
    lines.push(line);
  }

  const processedLines: string[] = [];
  let inListSection = false;
  let lastWasEmptyLine = true;

  for (const line of lines) {
    if (!line) {
      if (!lastWasEmptyLine) {
        processedLines.push('');
        lastWasEmptyLine = true;
      }
      continue;
    }
    lastWasEmptyLine = false;

    // Already valid markdown (from AI-authored text, or a previous pass) —
    // pass through as-is rather than re-heuristic-ing it.
    if (AI_JD_MARKDOWN_HEADING_RE.test(line)) {
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }
      processedLines.push(line);
      // Unlike the heuristic-heading branch below, don't force what follows
      // into a bullet list — source text that already writes real markdown
      // headings just as often follows with a plain prose paragraph (e.g.
      // "## Role Summary") as with a real list; an actual list under it
      // still gets caught on its own by the bullet/numbered branch above,
      // since it'll carry its own "-"/"1." marker.
      inListSection = false;
      continue;
    }
    if (AI_JD_BULLET_RE.test(line) || AI_JD_NUMBERED_RE.test(line)) {
      const normalized = AI_JD_NUMBERED_RE.test(line)
        ? line
        : `- ${line.replace(AI_JD_BULLET_RE, '')}`;
      processedLines.push(normalized);
      inListSection = true;
      continue;
    }

    const wholeLineBoldMatch = line.match(AI_JD_WHOLE_LINE_BOLD_RE);
    if (wholeLineBoldMatch || isLikelyAiJdHeading(line)) {
      const label = (wholeLineBoldMatch ? wholeLineBoldMatch[1] : line).trim();
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }
      processedLines.push(`## ${label.replace(/:\s*$/, '')}`);
      inListSection = true;
      continue;
    }

    // A plain key: value line outside any list (e.g. "Location: Bengaluru").
    // Skip lines that already have "**" — already bold, don't re-wrap them.
    if (!inListSection && line.includes(':') && !line.includes('**')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      if (value) {
        processedLines.push(`**${key.trim()}:** ${value}`);
        continue;
      }
    }

    if (inListSection) {
      const prev = processedLines[processedLines.length - 1];
      const prevEndsMidSentence = prev && prev.startsWith('- ') && !/[.!?:]$/.test(prev);
      if (prevEndsMidSentence) {
        // A hard line-wrap, not a new item — pypdf/docx split one sentence
        // across two lines; the previous one didn't end in terminal
        // punctuation, so this is its continuation, not the next bullet.
        processedLines[processedLines.length - 1] = `${prev} ${line}`;
      } else {
        processedLines.push(`- ${line}`);
      }
      continue;
    }

    processedLines.push(line);
  }

  let result = processedLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result
    .replace(/^( )+/gm, '')
    .replace(/(####)([^\s#])/g, matchMarkdownHeader)
    .replace(/(###)([^\s#])/g, matchMarkdownHeader)
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
  // There is no real backend yet, so "valid" here just means "a non-expired token
  // exists in storage" — that token may be a real backend JWT, or the seeded
  // dev-demo token minted by the login page (see src/shared/utils/auth/devAuthBypass.ts).
  // Either way this always checks it for real: nothing auto-authenticates on app load,
  // so an unauthenticated visit is always sent to /login first.
  const accessToken = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
  if (!accessToken) {
    return false;
  }
  try {
    const decodedToken = jwtDecode<{ exp: number }>(accessToken);
    if (decodedToken.exp <= Math.floor(Date.now() / 1000)) {
      return false;
    }
    return true;
  } catch {
    // jwt-decode throws InvalidTokenError for anything that isn't a
    // well-formed 3-part JWT (truncated/corrupted storage, a stray
    // non-token string, …). Both PublicRoute and PrivateRoute call this
    // synchronously during render with no error boundary above them, so an
    // uncaught throw here doesn't just fail the auth check — it takes down
    // the entire app to a blank screen. Treat a malformed token the same as
    // no token at all, and drop it so it doesn't keep failing on every
    // subsequent render (same pattern localstorage.helpers.ts's own
    // jwtDecode call sites already use).
    removeLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
    return false;
  }
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
