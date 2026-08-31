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
  // `note_text` is the real job-service field (JobNoteResponse — no
  // camelCase alias, job-service returns plain snake_case JSON). Without
  // it here, every job note's content resolved to '' and got silently
  // dropped by the `if (!content) return null` below — notes saved fine
  // on the backend, they just never made it back onto screen.
  const content = String(
    note.note_text ?? note.noteText ?? note.content ?? note.note ?? note.description ?? note.body ?? ''
  ).trim();
  if (!content) return null;

  const idRaw = note.id ?? note.noteId;
  const id = idRaw != null && idRaw !== '' ? String(idRaw) : `note-${index}`;

  // job-service's JobNoteResponse only ever returns `created_by` — a raw
  // user UUID, never a display name (see its own docstring: "the frontend
  // resolves the author's display name ... itself"). Not a name source, so
  // it's deliberately NOT in this chain — a UUID rendered as `authorName`
  // would just be a differently-wrong display than "Unknown User". The old
  // `note.createdBy` (camelCase) entry here never matched anything anyway
  // (the real field is snake_case) and, even if it had, would have shown a
  // raw id as a name. Real name resolution for job notes happens in
  // JobListingNotesPanel.tsx, which looks `authorId` up against this
  // tenant's user list after this mapper runs.
  const authorName = String(
    note.authorName ?? note.createdByName ?? note.userName ?? note.createdByUserName ?? ''
  ).trim();

  const authorRole =
    (note.authorRole ?? note.createdByRole ?? note.role ?? note.userRole) != null
      ? String(note.authorRole ?? note.createdByRole ?? note.role ?? note.userRole)
      : undefined;

  // `created_by` (snake_case) is job-service's real field — a UUID, not a
  // number, so this is kept as a string rather than run through `Number()`
  // (which silently turned every job-note author id into `NaN` ->
  // `undefined`, the same class of bug `note_text` above had for content).
  const authorIdRaw =
    note.authorId ??
    note.createdById ??
    note.createdBy ??
    note.created_by ??
    note.userId ??
    note.createdByUserId;
  const authorId = authorIdRaw != null && authorIdRaw !== '' ? String(authorIdRaw) : undefined;

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
    // Empty when nothing on the wire names the author (job notes, always,
    // per the comment above `authorName` — enriched from `authorId`
    // against this tenant's user list by JobListingNotesPanel.tsx after
    // this mapper runs; only falls back to 'Unknown User' if THAT lookup
    // also comes up empty).
    authorName,
    authorRole: authorRole || undefined,
    authorId,
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
