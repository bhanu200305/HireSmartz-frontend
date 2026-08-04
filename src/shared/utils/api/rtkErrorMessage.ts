/** Message from RTK Query mutation `catch` after `unwrap()` */
export function rtkErrorMessage(error: unknown): string {
  const e = error as { data?: { message?: string }; message?: string };
  if (typeof e?.data?.message === 'string' && e.data.message) return e.data.message;
  if (typeof e?.message === 'string' && e.message) return e.message;
  return 'Request failed. Please try again.';
}
