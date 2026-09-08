/**
 * Application-wide constants.
 *
 * Centralizes magic numbers, strings, and configuration values for maintainability.
 * Update these values rather than searching the codebase for hardcoded numbers.
 *
 * Organized by feature/domain for easier discovery and modification.
 */

// ============================================
// TIME & DURATION CONSTANTS
// ============================================

/**
 * Inactivity timeout before auto-logout
 * Set to 30 minutes (in milliseconds)
 */
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Token refresh check interval
 * Set to 5 minutes to refresh token before expiry
 */
export const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Epoch time conversion factor
 * Use when converting JWT exp (in seconds) to milliseconds
 * @example
 * const expireDate = new Date(decodedToken.exp * 1000)
 */
export const MS_TO_SECONDS = 1000;

/**
 * Session timeout for inactive users
 * Set to 15 minutes of inactivity
 */
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

// ============================================
// PAGINATION CONSTANTS
// ============================================

/**
 * Default page size for data tables and lists
 * Used as default when no size specified
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Available page size options for user selection
 * Provides standard pagination choices
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Maximum results allowed per request
 * Backend may enforce this limit
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Minimum page size to prevent excessive data
 */
export const MIN_PAGE_SIZE = 1;

/**
 * Debounce delay (ms) for the pagination page-number input.
 * Navigation fires this many milliseconds after the user stops typing.
 */
export const PAGINATION_DEBOUNCE_DELAY = 600;

// ============================================
// FILE UPLOAD CONSTANTS
// ============================================

/**
 * Maximum number of files allowed in bulk upload
 * Used for CSV imports, bulk candidate uploads, etc.
 */
export const MAX_FILES_UPLOAD = 30;

/**
 * Maximum file size in megabytes (user-friendly)
 * Use with conversion to bytes: MAX_FILE_SIZE_MB * 1024 * 1024
 */
export const MAX_FILE_SIZE_MB = 5;

/**
 * Maximum file size in bytes (for actual validation)
 */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Allowed file types for resume/document upload
 * Matches common file extensions
 */
export const ALLOWED_RESUME_TYPES = ['.pdf', '.doc', '.docx'];

/**
 * Allowed image file types for avatars/logos
 */
export const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Allowed CSV file types for bulk imports
 */
export const ALLOWED_CSV_TYPES = ['.csv'];

// ============================================
// FORM & VALIDATION CONSTANTS
// ============================================

/**
 * Minimum phone number length (digits only)
 * Typically 10 digits for US numbers
 */
export const MIN_PHONE_LENGTH = 10;

/**
 * Maximum phone number length (digits only)
 * International numbers can be longer
 */
export const MAX_PHONE_LENGTH = 15;

/**
 * Minimum password length for security
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Maximum password length
 */
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Maximum job title length
 */
export const MAX_JOB_TITLE_LENGTH = 255;

/**
 * Maximum company name length
 */
export const MAX_COMPANY_NAME_LENGTH = 255;

/**
 * Maximum user first/last name length
 */
export const MAX_NAME_LENGTH = 100;

// ============================================
// PHONE FORMATTING CONSTANTS
// ============================================

/**
 * Phone number format indices for formatting
 * Used to format numbers as: (XXX) XXX-XXXX
 */
export const PHONE_FORMAT_INDICES = {
  AREA_CODE_START: 0,
  AREA_CODE_END: 3,
  PREFIX_START: 3,
  PREFIX_END: 6,
  LINE_NUMBER_START: 6,
  LINE_NUMBER_END: 10,
};

/**
 * Phone number regex pattern for validation
 * Matches formats: (123) 456-7890, 123-456-7890, 1234567890
 */
export const PHONE_REGEX = /^(\+?1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

// ============================================
// DEBOUNCE & THROTTLE CONSTANTS
// ============================================

/**
 * Debounce delay for search input
 * Delays API call until user stops typing (500ms)
 */
export const SEARCH_DEBOUNCE_MS = 500;

/**
 * Debounce delay for filter changes
 * Used to batch multiple filter updates
 */
export const FILTER_DEBOUNCE_MS = 300;

/**
 * Throttle delay for scroll events
 */
export const SCROLL_THROTTLE_MS = 100;

/**
 * Debounce delay for auto-save forms
 */
export const AUTOSAVE_DEBOUNCE_MS = 1000;

// ============================================
// ANIMATION & TRANSITION CONSTANTS
// ============================================

/**
 * Default transition duration (milliseconds)
 * Used for CSS animations and React transitions
 */
export const TRANSITION_DURATION_MS = 300;

/**
 * Toast notification auto-dismiss duration
 */
export const TOAST_DISMISS_MS = 4000;

/**
 * Modal fade-in duration
 */
export const MODAL_TRANSITION_MS = 200;

// ============================================
// INTERVIEW & VIDEO CONSTANTS
// ============================================

/**
 * Interview session timeout
 * Automatically end interview after 4 hours
 */
export const INTERVIEW_TIMEOUT_MS = 4 * 60 * 60 * 1000;

/**
 * Recording quality preset (if using video recording)
 * Options: 'low', 'medium', 'high'
 */
export const RECORDING_QUALITY = 'high';

/**
 * Maximum interview duration in minutes
 * Used to warn if interview going too long
 */
export const MAX_INTERVIEW_DURATION_MINUTES = 240;

/**
 * Minimum interview duration in minutes
 */
export const MIN_INTERVIEW_DURATION_MINUTES = 15;

// ============================================
// NOTIFICATION & ALERT CONSTANTS
// ============================================

/**
 * Toast types for notifications
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Error message display timeout (milliseconds)
 * Longer than success messages for visibility
 */
export const ERROR_TOAST_DURATION_MS = 6000;

/**
 * Success message display timeout
 */
export const SUCCESS_TOAST_DURATION_MS = 3000;

// ============================================
// RETRY & POLLING CONSTANTS
// ============================================

/**
 * Max retry attempts for failed API requests
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Polling interval for real-time data updates
 * Used for interview progress, candidate status, etc.
 */
export const POLLING_INTERVAL_MS = 5000;

/**
 * Initial retry delay (exponential backoff)
 */
export const RETRY_DELAY_MS = 1000;

// ============================================
// STRING CONSTANTS
// ============================================

/**
 * Empty state message
 */
export const EMPTY_STATE_MESSAGE = 'No data available';

/**
 * Loading state message
 */
export const LOADING_MESSAGE = 'Loading...';

/**
 * Default error message
 */
export const DEFAULT_ERROR_MESSAGE = 'An error occurred. Please try again.';

/**
 * Network error message
 */
export const NETWORK_ERROR_MESSAGE = 'Network error. Check your connection and try again.';

/**
 * Unauthorized error message
 */
export const UNAUTHORIZED_ERROR_MESSAGE = 'You are not authorized to perform this action.';

/**
 * Session expired message
 */
export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please login again.';

// ============================================
// REGEX & PATTERN CONSTANTS
// ============================================

/**
 * Email regex pattern for validation
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * URL regex pattern
 */
export const URL_REGEX = /^https?:\/\/[\w-]+(\.[\w-]+)+[/#?]?.*$/;

/**
 * Alphanumeric regex (letters and numbers only)
 */
export const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;

/**
 * Special characters to allow in names
 */
export const NAME_ALLOWED_SPECIAL_CHARS = ['-', "'", ' '];

// ============================================
// COLOR & THEME CONSTANTS
// ============================================

/**
 * Success color code
 */
export const COLOR_SUCCESS = '#10b981';

/**
 * Error color code
 */
export const COLOR_ERROR = '#ef4444';

/**
 * Warning color code
 */
export const COLOR_WARNING = '#f59e0b';

/**
 * Info color code
 */
export const COLOR_INFO = '#3b82f6';

/**
 * Neutral/Gray color code
 */
export const COLOR_NEUTRAL = '#6b7280';

// ============================================
// ACCESSIBILITY CONSTANTS
// ============================================

/**
 * Maximum time user should wait for response
 * WCAG guideline: 2 seconds for critical updates
 */
export const ARIA_LIVE_ANNOUNCE_DELAY_MS = 2000;

/**
 * Skip link target ID
 */
export const SKIP_TO_MAIN_CONTENT_ID = 'main-content';

// Unicode-aware regex patterns for international name support
// export const ALLOWED_CHARS_REGEX = /^[\p{L} .\-’'']+$/u;
// export const NO_CONSECUTIVE_SPECIAL_CHARS = /([\p{L}]*[ .\-’'']{2,})/u;
// export const STARTS_WITH_LETTER = /^[\p{L}]/u;
// export const ENDS_WITH_LETTER_OR_DOT = /[\p{L}.]$/u;
export const FORM_EMAIL_REGEX = /^[a-zA-Z0-9._+@-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ============================================
// NYLAS CALENDAR CONSTANTS
// ============================================

/**
 * Delay (ms) before redirecting to dashboard after calendar connection
 * Set to 3 seconds to allow the user to read the success/error message
 */
export const CALENDAR_CONNECT_REDIRECT_DELAY_MS = 3000;

/**
 * Nylas Scheduler API base URL (US region)
 * Used as the schedulerApiUrl prop for the NylasScheduling component
 */
export const NYLAS_SCHEDULER_API_URL = import.meta.env.VITE_NYLAS_SCHEDULER_API_URL ?? '';

/**
 * Nylas application Client ID
 * Required by NylasScheduling to associate configuration IDs with your Nylas app
 * Set via VITE_NYLAS_CLIENT_ID in your .env file
 */
export const NYLAS_CLIENT_ID = import.meta.env.VITE_NYLAS_CLIENT_ID ?? '';

// ============================================
// AI CALL SCHEDULING CONSTANTS
// ============================================

/**
 * Timezone used for AI call slot fetching and booking.
 * Sent as the `timezone` param to /interview/ai-slots and /interview/ai-book-slot.
 */
export const AI_SCHEDULE_TIMEZONE = 'America/Los_Angeles';

/**
 * Number of days beyond today that the AI call scheduling calendar is open.
 * A value of 6 means candidates can book from today through today + 6 days (7 days total).
 */
export const AI_SCHEDULE_WINDOW_DAYS = 13;

/**
 * Minimum lead time before an AI-call slot can be booked. interview-service
 * enumerates slots across the whole local calendar day (midnight onward) with
 * no "already past" filter, so for *today* the raw list includes slots that
 * have already elapsed — the frontend drops any slot starting within this
 * window of "now".
 */
export const AI_SLOT_MIN_LEAD_MINUTES = 10;

// ============================================
// DUPLICATE CANDIDATE MODAL CONSTANTS
// ============================================

/**
 * Text constants for the blocking duplicate-candidate alert modal.
 * Shown on the candidate listing screen after batch upload analysis completes.
 */
export const DUPLICATE_CANDIDATE_MODAL = {
  TITLE: 'Duplicate Resumes Detected',
  SUBTITLE: (count: number) =>
    `${count} resume${count !== 1 ? 's' : ''} cannot be uploaded. These resumes already exist for this job opening.`,
  INFO_NOTE:
    'Duplicate candidates are identified using the email address extracted from the resume.',
  BUTTON_LABEL: 'Acknowledge',
} as const;
