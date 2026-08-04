// ============================================
// COMPANY LOGO UPLOAD CONSTRAINTS
// ============================================

/**
 * Maximum file size for company logo uploads in megabytes
 * Used for validation before upload to prevent oversized files
 */
export const MAX_LOGO_FILE_SIZE_MB = 5;

/**
 * Maximum file size for company logo in bytes
 * Used for actual size comparison
 */
export const MAX_LOGO_FILE_SIZE_BYTES = MAX_LOGO_FILE_SIZE_MB * 1024 * 1024;

/**
 * Allowed file types for logo upload
 * Supports PNG and JPEG formats
 */
export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

/**
 * Error message for logo file size exceeding limit
 * Displayed to user when file validation fails
 */
export const LOGO_FILE_SIZE_ERROR_MESSAGE = 'Logo file size must not exceed 5 MB.';

/**
 * Error message for invalid logo file type
 * Displayed to user when file type is not supported
 */
export const LOGO_FILE_TYPE_ERROR_MESSAGE = 'Invalid file type. Please upload PNG or JPG.';

// ============================================
// MIME TYPE SIGNATURES
// ============================================

export const MIME_SIGNATURES: MIMESIGNATURE = {
  JVBERi0: 'application/pdf',
  UEsDBBQ: {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  '0M8R4KGx': {
    doc: 'application/msword',
    xls: 'application/vnd.ms-excel',
    ppt: 'application/vnd.ms-powerpoint',
  },
  '/9j/': 'image/jpeg',
  iVBORw0KGgo: 'image/png',
  R0lGOD: 'image/gif',
  '<svg': 'image/svg+xml',
  AAAAFGZ0: 'video/mp4',
  SUQz: 'audio/mpeg',
  UEsFB: 'application/zip',
  'data:text/plain': 'text/plain',
};

type MIMESIGNATURE = {
  [key: string]: any;
};
