// Used until the backend's list arrives, or if it cannot be fetched.
export const FALLBACK_EXTENSIONS = ['.xlsx', '.csv'];

/** ".xlsx, .csv or .txt" style list for the upload tooltip. */
export const joinExtensions = (extensions: string[]): string =>
  extensions.length < 2
    ? extensions.join('')
    : `${extensions.slice(0, -1).join(', ')} or ${extensions[extensions.length - 1]}`;
