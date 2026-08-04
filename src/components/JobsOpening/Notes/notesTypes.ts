export type CandidateNoteItem = {
  id: string;
  content: string;
  parentType?: string;
  createdAt?: string;
  authorName: string;
  authorRole?: string;
  authorId?: number;
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
