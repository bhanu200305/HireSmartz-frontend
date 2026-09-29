export type CandidateNoteItem = {
  id: string;
  content: string;
  parentType?: string;
  createdAt?: string;
  /** Set only once a note has actually been edited (job-service's `modified_at`, null until then) — drives the "(edited)" label. */
  editedAt?: string;
  authorName: string;
  authorRole?: string;
  // A user id, whatever shape the source service actually uses — a UUID
  // for job-service/organization-service, a legacy numeric id for
  // candidate-service. Kept as a string and compared by string equality
  // (NotesSidePanel.tsx) rather than run through `Number()`, which quietly
  // turned every UUID into `NaN` and made "is this my note" never match
  // for job notes.
  authorId?: string;
  roundId?: number;
  /** Interview booking id when returned by API (for round-scoped counts/filters). */
  bookingId?: number;
  roundName?: string;
  contextLabel: string;
};

/** Counts API notes tied to an interview round (matches booking vs round id variants). */
export function countNotesForRound(
  interviewRoundId: number,
  interviewBookingId: number | undefined | null,
  apiNotes: CandidateNoteItem[]
): number {
  const rid = Number(interviewRoundId);
  if (!Number.isFinite(rid) || rid <= 0) return 0;
  const bid = Number(interviewBookingId ?? interviewRoundId);
  return apiNotes.filter((n) => {
    const nr = n.roundId != null ? Number(n.roundId) : NaN;
    const nb = n.bookingId != null ? Number(n.bookingId) : NaN;
    return nr === rid || nb === rid || nr === bid || nb === bid;
  }).length;
}
