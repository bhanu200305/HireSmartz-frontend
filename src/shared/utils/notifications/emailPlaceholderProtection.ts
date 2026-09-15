/**
 * Protects notification-service's Jinja `{{ variable }}` placeholders inside
 * the Notification Copy / Email Templates editor (My Company → Email
 * Templates, and its Super Admin edit-on-behalf-of twin under Companies →
 * a company → Email Templates) from being edited or removed by whoever is
 * customising the copy.
 *
 * Distinct from `smsPlaceholderProtection.ts`
 * (components/CompanySettings/smsPlaceholderProtection.ts) — that one guards
 * a different, single-brace `{token}` system belonging to the separate
 * candidate-facing SMS Templates feature. This one guards notification-
 * service's own `{{ }}` templates: the email subject/body AND its
 * `sms_message` field (MFA codes, account-locked alerts, …), which renders
 * through the exact same Jinja engine as the email body — see
 * jinja_renderer.py's `_interpolate` / `_render_sms`.
 *
 * STRONGER THAN THE SMS VERSION, ON PURPOSE. That one deliberately allows a
 * full-token delete — "placeholders can be removed or moved". This one does
 * not allow removal at all, only repositioning within the surrounding text.
 * The bug this exists to close: a tenant admin deleted `{{ company_name }}`
 * from an invite subject and typed a different company's name in its place
 * — "Join samsung on {{ platform_name }}" on a tenant that is not Samsung —
 * and it saved and sent, because notification-service's save-time
 * test-render only rejects an UNKNOWN variable, never a MISSING one. A
 * companion change has been requested of notification-service itself to
 * reject that server-side (the real guarantee — this module is only the
 * client-side half, so an admin hits a clear in-editor block instead of a
 * confusing 422 after composing a whole message).
 */

export const EMAIL_PLACEHOLDER_REGEX = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g;

export const EMAIL_PLACEHOLDER_PROTECTED_MESSAGE =
  "System placeholders like {{ company_name }} can't be edited or removed. Reword the text around them instead.";

export type PlaceholderRange = {
  start: number;
  end: number;
  value: string;
};

export const extractPlaceholderTokens = (value: string): string[] =>
  value.match(new RegExp(EMAIL_PLACEHOLDER_REGEX.source, 'g')) ?? [];

export const getPlaceholderRanges = (value: string): PlaceholderRange[] => {
  const ranges: PlaceholderRange[] = [];
  const regex = new RegExp(EMAIL_PLACEHOLDER_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      value: match[0],
    });
  }
  return ranges;
};

/**
 * True on ANY overlap with a placeholder — full or partial. Unlike the SMS
 * guard's "partial only" version, a full-token selection is also blocked
 * here: there is no clean delete of a protected placeholder in this editor.
 */
export const selectionIntersectsPlaceholder = (
  value: string,
  selectionStart: number,
  selectionEnd: number
): boolean => {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  return getPlaceholderRanges(value).some((range) => start < range.end && end > range.start);
};

/**
 * Expand a selection so a touched placeholder is fully highlighted after a
 * blocked edit is rejected — purely cosmetic, so the user sees what they
 * can't type over rather than the keystroke silently vanishing.
 */
export const expandSelectionToPlaceholders = (
  value: string,
  selectionStart: number,
  selectionEnd: number
): { start: number; end: number } => {
  let start = Math.min(selectionStart, selectionEnd);
  let end = Math.max(selectionStart, selectionEnd);
  getPlaceholderRanges(value).forEach((range) => {
    if (start < range.end && end > range.start) {
      start = Math.min(start, range.start);
      end = Math.max(end, range.end);
    }
  });
  return { start, end };
};

/**
 * Caret/selection-level guard for `onKeyDown` and `onBeforeInput`. Any
 * delete, backspace, inserted character, or newline that would touch a
 * placeholder — a selection overlapping it at all, or an empty caret sitting
 * inside or against it — is blocked outright.
 */
export const shouldBlockPlaceholderEdit = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  key: string
): boolean => {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  if (start !== end) {
    return selectionIntersectsPlaceholder(value, start, end);
  }

  const ranges = getPlaceholderRanges(value);
  if (key === 'Backspace') {
    return ranges.some((range) => start > range.start && start <= range.end);
  }
  if (key === 'Delete') {
    return ranges.some((range) => start >= range.start && start < range.end);
  }
  // Inserting/typing a character, a paste, or a newline with the caret
  // resting inside a token.
  if (key.length === 1 || key === 'Enter') {
    return ranges.some((range) => start > range.start && start < range.end);
  }
  return false;
};

/**
 * Maps a native `InputEvent.inputType` (what `onBeforeInput` actually fires
 * with — IME composition, mobile keyboards, paste, and drag-drop all skip
 * `onKeyDown` entirely) to the synthetic "key" the guards above understand.
 */
export const inputTypeToPlaceholderGuardKey = (inputType: string): string | null => {
  if (
    inputType === 'deleteContentBackward' ||
    inputType === 'deleteWordBackward' ||
    inputType === 'deleteSoftLineBackward' ||
    inputType === 'deleteHardLineBackward' ||
    inputType === 'deleteByCut'
  ) {
    return 'Backspace';
  }
  if (inputType.startsWith('delete')) {
    return 'Delete';
  }
  if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
    return 'Enter';
  }
  if (
    inputType === 'insertText' ||
    inputType === 'insertCompositionText' ||
    inputType === 'insertFromPaste' ||
    inputType === 'insertFromDrop'
  ) {
    return 'a';
  }
  return null;
};

/**
 * Value-level safety net for whatever reaches `onChange` despite the
 * keystroke guards above (autofill, a paste path a given browser doesn't
 * route through `beforeinput`, drag-and-drop text, …): every placeholder
 * token present in `previousValue` must still appear, at least as many
 * times, in `nextValue`. Reordering/repositioning a token is fine; any drop
 * in its count — a whole removal, or a rename that looks like one token
 * disappearing while another appears — is rejected.
 */
export const resolveProtectedEmailContent = (
  previousValue: string,
  nextValue: string
): { accepted: boolean; value: string } => {
  if (previousValue === nextValue) {
    return { accepted: true, value: nextValue };
  }

  const prevCounts = new Map<string, number>();
  for (const token of extractPlaceholderTokens(previousValue)) {
    prevCounts.set(token, (prevCounts.get(token) ?? 0) + 1);
  }
  const nextCounts = new Map<string, number>();
  for (const token of extractPlaceholderTokens(nextValue)) {
    nextCounts.set(token, (nextCounts.get(token) ?? 0) + 1);
  }
  for (const [token, count] of prevCounts) {
    if ((nextCounts.get(token) ?? 0) < count) {
      return { accepted: false, value: previousValue };
    }
  }
  return { accepted: true, value: nextValue };
};
