export const SMS_PLACEHOLDER_REGEX = /\{[a-zA-Z0-9_]+\}/g;

export const SMS_PLACEHOLDER_MODIFIED_MESSAGE =
  'System placeholders cannot be modified. Please use the predefined placeholders as-is.';

export type PlaceholderRange = {
  start: number;
  end: number;
  value: string;
};

export type PlaceholderResolveReason = 'modified' | 'unsupported' | null;

export const extractPlaceholderTokens = (value: string): string[] =>
  value.match(new RegExp(SMS_PLACEHOLDER_REGEX.source, 'g')) ?? [];

export const getPlaceholderRanges = (value: string): PlaceholderRange[] => {
  const ranges: PlaceholderRange[] = [];
  const regex = new RegExp(SMS_PLACEHOLDER_REGEX.source, 'g');
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

/** Normalize API allow-list entries to `{token}` form. */
export const normalizeAllowedPlaceholders = (
  placeholders: string[] | null | undefined
): string[] => {
  if (!placeholders?.length) return [];
  return Array.from(
    new Set(
      placeholders
        .map((item) => {
          const trimmed = item.trim();
          if (!trimmed) return '';
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
          return `{${trimmed.replace(/^\{|\}$/g, '')}}`;
        })
        .filter(Boolean)
    )
  );
};

export const getUnsupportedPlaceholders = (
  content: string,
  allowedPlaceholders: string[]
): string[] => {
  const allowed = new Set(normalizeAllowedPlaceholders(allowedPlaceholders));
  return Array.from(
    new Set(extractPlaceholderTokens(content).filter((token) => !allowed.has(token)))
  );
};

/**
 * True when selection overlaps a placeholder without covering it completely.
 */
export const selectionPartiallyIntersectsPlaceholder = (
  value: string,
  selectionStart: number,
  selectionEnd: number
): boolean => {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  return getPlaceholderRanges(value).some((range) => {
    const intersects = start < range.end && end > range.start;
    const fullyCovered = start <= range.start && end >= range.end;
    return intersects && !fullyCovered;
  });
};

/** Expand a selection so any touched placeholders are fully included. */
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

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Collapse every `{token}` to a sentinel so surrounding text can be compared. */
const placeholderSkeleton = (value: string): string =>
  value.replace(new RegExp(SMS_PLACEHOLDER_REGEX.source, 'g'), '\0');

/**
 * Detects edits that break an existing `{token}` without removing it entirely
 * (e.g. `{candidateName}` → `{candidateName` or `{candidateNam}`).
 */
const hasBrokenPlaceholderRemnant = (previousValue: string, nextValue: string): boolean => {
  const previousRanges = getPlaceholderRanges(previousValue);
  const nextTokens = new Set(extractPlaceholderTokens(nextValue));

  for (const range of previousRanges) {
    if (nextTokens.has(range.value)) continue;

    const inner = range.value.slice(1, -1);
    // Opening brace + token body still present but closing brace missing / altered.
    const openWithoutClose = new RegExp(`\\{${escapeRegExp(inner)}(?!\\})`);
    if (openWithoutClose.test(nextValue)) {
      return true;
    }
  }

  return false;
};

/**
 * True when an existing `{token}` was renamed or altered
 * (e.g. `{candidateName}` → `{Candidate}`), rather than removed wholesale
 * or left unchanged while surrounding text was edited.
 */
export const hasAlteredProtectedPlaceholder = (
  previousValue: string,
  nextValue: string
): boolean => {
  if (previousValue === nextValue) return false;
  if (hasBrokenPlaceholderRemnant(previousValue, nextValue)) return true;

  const prevTokens = extractPlaceholderTokens(previousValue);
  const nextTokens = extractPlaceholderTokens(nextValue);

  // In-place rename/edit: brace layout unchanged but token text differs.
  if (placeholderSkeleton(previousValue) === placeholderSkeleton(nextValue)) {
    return prevTokens.some((token, index) => token !== nextTokens[index]);
  }

  // Same placeholder count but different token multiset while other text changed.
  if (prevTokens.length === nextTokens.length && prevTokens.length > 0) {
    const sortedPrev = [...prevTokens].sort();
    const sortedNext = [...nextTokens].sort();
    if (sortedPrev.some((token, index) => token !== sortedNext[index])) {
      return true;
    }
  }

  // Pure deletions must not introduce a replacement token for a removed one.
  if (nextTokens.length < prevTokens.length) {
    const prevCounts = new Map<string, number>();
    for (const token of prevTokens) {
      prevCounts.set(token, (prevCounts.get(token) ?? 0) + 1);
    }
    for (const token of nextTokens) {
      const count = prevCounts.get(token) ?? 0;
      if (count === 0) return true;
      prevCounts.set(token, count - 1);
    }
  }

  return false;
};

export const resolveProtectedPlaceholderContent = (
  previousValue: string,
  nextValue: string,
  allowedPlaceholders: string[]
): {
  accepted: boolean;
  value: string;
  unsupported: string[];
  reason: PlaceholderResolveReason;
} => {
  if (hasAlteredProtectedPlaceholder(previousValue, nextValue)) {
    return { accepted: false, value: previousValue, unsupported: [], reason: 'modified' };
  }

  const allowed = normalizeAllowedPlaceholders(allowedPlaceholders);

  // While allow-list is unavailable, only block altered/broken placeholder edits.
  if (allowed.length === 0) {
    return { accepted: true, value: nextValue, unsupported: [], reason: null };
  }

  const unsupported = getUnsupportedPlaceholders(nextValue, allowed);
  if (unsupported.length > 0) {
    return { accepted: false, value: previousValue, unsupported, reason: 'unsupported' };
  }

  return { accepted: true, value: nextValue, unsupported: [], reason: null };
};

export const inputTypeToPlaceholderGuardKey = (inputType: string): string | null => {
  if (
    inputType === 'deleteContentBackward' ||
    inputType === 'deleteWordBackward' ||
    inputType === 'deleteSoftLineBackward' ||
    inputType === 'deleteHardLineBackward'
  ) {
    return 'Backspace';
  }
  if (inputType.startsWith('delete')) {
    return 'Delete';
  }
  if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
    return 'Enter';
  }
  if (inputType === 'insertText' || inputType === 'insertCompositionText') {
    return 'a';
  }
  return null;
};

/**
 * Block keystrokes that would edit *inside* a placeholder (partial modify).
 * Full-token delete/cut is allowed so placeholders can be removed or moved.
 */
export const shouldBlockPlaceholderKeyEdit = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  key: string
): boolean => {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const ranges = getPlaceholderRanges(value);

  if (key === 'Backspace' || key === 'Delete') {
    if (start !== end) {
      // Block only partial selection over a placeholder; full-token delete is allowed.
      return selectionPartiallyIntersectsPlaceholder(value, start, end);
    }
    if (key === 'Backspace') {
      return ranges.some((range) => start > range.start && start <= range.end);
    }
    return ranges.some((range) => start >= range.start && start < range.end);
  }

  // Inserting/replacing text must not land inside a placeholder.
  if (key.length === 1 || key === 'Enter') {
    if (start !== end) {
      return selectionPartiallyIntersectsPlaceholder(value, start, end);
    }
    return ranges.some((range) => start > range.start && start < range.end);
  }

  return false;
};
