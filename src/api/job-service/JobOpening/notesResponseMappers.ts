import type { CandidateNoteItem } from '../../../components/JobsOpening/Notes/notesTypes';

function unwrapNotesArray(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  const r = response as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') return [];
  const data = r.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { notes?: unknown[] }).notes)) {
    return (data as { notes: unknown[] }).notes;
  }
  if (Array.isArray(r.notes)) return r.notes as unknown[];
  return [];
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (name.slice(0, 2) || '??').toUpperCase();
}

export function mapApiNoteToCandidateNoteItem(
  note: Record<string, unknown>,
  index: number
): CandidateNoteItem | null {
  const content = String(
    note.noteText ?? note.content ?? note.note ?? note.description ?? note.body ?? ''
  ).trim();
  if (!content) return null;

  const idRaw = note.id ?? note.noteId;
  const id = idRaw != null && idRaw !== '' ? String(idRaw) : `note-${index}`;

  const authorName = String(
    note.authorName ??
      note.createdByName ??
      note.userName ??
      note.createdByUserName ??
      note.createdBy ??
      'Unknown User'
  );

  const authorRole =
    (note.authorRole ?? note.createdByRole ?? note.role ?? note.userRole) != null
      ? String(note.authorRole ?? note.createdByRole ?? note.role ?? note.userRole)
      : undefined;

  const authorIdRaw =
    note.authorId ?? note.createdById ?? note.createdBy ?? note.userId ?? note.createdByUserId;
  const authorId = authorIdRaw != null && authorIdRaw !== '' ? Number(authorIdRaw) : undefined;

  const createdAt =
    (note.createdAt ?? note.updatedAt ?? note.timestamp ?? note.created_at) != null
      ? String(note.createdAt ?? note.updatedAt ?? note.timestamp ?? note.created_at)
      : undefined;

  const roundObj = note.round as { id?: unknown; name?: string } | undefined;
  const roundNameRaw =
    note.roundName ?? note.interviewRoundName ?? roundObj?.name ?? note.roundNameLabel;
  const roundName = roundNameRaw != null ? String(roundNameRaw) : undefined;

  const interviewRoundNestedId =
    roundObj?.id != null && roundObj.id !== '' ? Number(roundObj.id) : undefined;
  const interviewRoundId = note.interviewRoundId ?? note.roundId ?? interviewRoundNestedId;
  let roundId =
    interviewRoundId != null && interviewRoundId !== '' ? Number(interviewRoundId) : undefined;
  if (roundId != null && !Number.isFinite(roundId)) {
    roundId = undefined;
  }

  const interviewBooking = note.interviewBooking as { id?: unknown } | undefined;
  const bookingRaw = note.interviewBookingId ?? note.bookingId ?? interviewBooking?.id;
  let bookingId = bookingRaw != null && bookingRaw !== '' ? Number(bookingRaw) : undefined;
  if (bookingId != null && !Number.isFinite(bookingId)) {
    bookingId = undefined;
  }

  const contextFromApi = note.contextLabel ?? note.noteType ?? note.type;
  const contextLabel =
    contextFromApi != null ? String(contextFromApi) : initialsFromName(authorName);
  const parentTypeRaw = note.parentType ?? note.parent_type;
  const parentType = parentTypeRaw != null ? String(parentTypeRaw) : undefined;
  const parentTypeUpper = parentType != null ? parentType.toUpperCase() : '';

  /** Create/update round notes use `parentId` = interview booking (or interview id fallback); `/all` often omits bookingId/roundId without this. */
  const parentIdRaw = note.parentId ?? note.parent_id;
  const parentIdNum = parentIdRaw != null && parentIdRaw !== '' ? Number(parentIdRaw) : undefined;
  const parentIdOk = parentIdNum != null && Number.isFinite(parentIdNum);

  const isCandidateRoundParent =
    parentTypeUpper === 'CANDIDATE_ROUND' ||
    parentTypeUpper === 'CANDIDATE-ROUND' ||
    parentTypeUpper.replace(/_/g, '-') === 'CANDIDATE-ROUND';

  if (isCandidateRoundParent && parentIdOk && bookingId == null) {
    /** Matches create payload `parentId` for CANDIDATE_ROUND (booking / interview-scoped id). */
    bookingId = parentIdNum;
  }

  return {
    id,
    content,
    parentType,
    createdAt,
    authorName,
    authorRole: authorRole || undefined,
    authorId: Number.isFinite(authorId) && !Number.isNaN(authorId!) ? authorId : undefined,
    roundId: roundId != null && Number.isFinite(roundId) ? roundId : undefined,
    roundName,
    bookingId: bookingId != null && Number.isFinite(bookingId) ? bookingId : undefined,
    contextLabel,
  };
}

export function mapApiNotesResponseToItems(response: unknown): CandidateNoteItem[] {
  const rows = unwrapNotesArray(response);
  const out: CandidateNoteItem[] = [];
  rows.forEach((row, index) => {
    if (row && typeof row === 'object') {
      const mapped = mapApiNoteToCandidateNoteItem(row as Record<string, unknown>, index);
      if (mapped) out.push(mapped);
    }
  });
  return out;
}
