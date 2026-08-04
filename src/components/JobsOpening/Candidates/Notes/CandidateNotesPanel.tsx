import dayjs from 'dayjs';
import { useMemo } from 'react';
import { get } from 'lodash-es';
import NotesSidePanel, {
  type NotesRemoteActions,
  type NotesRoundContext,
} from '../../Notes/NotesSidePanel';
import type { CandidateNoteItem } from '../../Notes/notesTypes';
import { showToast } from '../../../shared';
import {
  useGetCandidateNotesAllQuery,
  useGetRoundNotesQuery,
  useCreateJobOpeningNoteMutation,
  useUpdateJobOpeningNoteMutation,
  useDeleteJobOpeningNoteMutation,
} from '../../../../api/job-service/JobOpening/JobOpeningNotes';

export type { CandidateNoteItem } from '../../Notes/notesTypes';
export type { NotesRoundContext };

const parseDate = (value?: string) => {
  if (!value) return 0;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.valueOf() : 0;
};

const getCandidateRawNotes = (candidate: any) =>
  candidate?.candidateNotes || candidate?.notes || candidate?.noteDtos || [];

const getRoundRawNotes = (round: any) =>
  round?.notes || round?.candidateNotes || round?.noteDtos || [];

/** Maps embedded candidate/round notes from GET candidate-by-id (fallback / legacy). */
export const buildCandidateNotesTimeline = (
  candidate: any,
  onlyRoundId?: number | null
): CandidateNoteItem[] => {
  const rounds = candidate?.interviewRounds || [];

  const candidateLevelNotes = (getCandidateRawNotes(candidate) || []).map(
    (note: any, index: number) => ({
      id: String(note?.id || `candidate-note-${index}`),
      content: String(note?.content || note?.note || note?.description || '').trim(),
      parentType: String(note?.parentType || 'CANDIDATE'),
      createdAt: note?.createdAt || note?.updatedAt || note?.timestamp,
      authorName: note?.authorName || note?.createdByName || note?.userName || 'Unknown User',
      authorRole: note?.authorRole || note?.createdByRole || note?.role,
      authorId: Number(note?.authorId || note?.createdBy || note?.userId || 0) || undefined,
      roundId: undefined,
      roundName: undefined,
      contextLabel: 'Candidate Note',
    })
  );

  const roundLevelNotes = rounds.flatMap((round: any, roundIndex: number) => {
    const displayRoundName = round?.round?.name || round?.name || `Round ${roundIndex + 1}`;
    return (getRoundRawNotes(round) || []).map((note: any, noteIndex: number) => ({
      id: String(note?.id || `round-${round?.id || roundIndex}-note-${noteIndex}`),
      content: String(note?.content || note?.note || note?.description || '').trim(),
      parentType: String(note?.parentType || 'CANDIDATE_ROUND'),
      createdAt: note?.createdAt || note?.updatedAt || note?.timestamp,
      authorName: note?.authorName || note?.createdByName || note?.userName || 'Unknown User',
      authorRole: note?.authorRole || note?.createdByRole || note?.role,
      authorId: Number(note?.authorId || note?.createdBy || note?.userId || 0) || undefined,
      roundId: Number(round?.id) || undefined,
      roundName: displayRoundName,
      contextLabel: displayRoundName,
    }));
  });

  const mergedNotes = [...candidateLevelNotes, ...roundLevelNotes]
    .filter((note) => note.content.length > 0)
    .filter((note) => (onlyRoundId ? note.roundId === onlyRoundId : true))
    .sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));

  return mergedNotes;
};

type CandidateNotesPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** @deprecated Prefer emptyStateSubtitle. Overrides empty-state supporting line when set. */
  emptyMessage?: string;
  emptyStateTitle?: string;
  emptyStateSubtitle?: string;
  composerPlaceholder?: string;
  /**
   * When > 0, loads and saves notes via `/job-opening/notes/...` APIs.
   * When omitted or 0, falls back to `notes` prop only (legacy).
   */
  candidateId?: number;
  /**
   * When set with a positive id, fetches round-scoped notes and creates with parentType CANDIDATE_ROUND + bookingId.
   */
  roundBookingId?: number | null;
  roundContext?: NotesRoundContext | null;
  layout?: 'default' | 'compact';
  /** Legacy static notes when `candidateId` is not set. */
  notes?: CandidateNoteItem[];
};

const CandidateNotesPanel = ({
  open,
  onClose,
  title,
  emptyMessage,
  emptyStateTitle,
  emptyStateSubtitle,
  composerPlaceholder,
  candidateId = 0,
  roundBookingId = null,
  roundContext = null,
  layout: layoutProp,
  notes: legacyNotes = [],
}: CandidateNotesPanelProps) => {
  const layout = layoutProp !== undefined ? layoutProp : roundContext ? 'compact' : 'default';

  const cid = Number(candidateId);
  const useApi = Number.isFinite(cid) && cid > 0;
  const hasRound =
    roundBookingId != null && Number.isFinite(Number(roundBookingId)) && Number(roundBookingId) > 0;
  const bookingId = hasRound ? Number(roundBookingId) : 0;

  const skipAllQuery = !open || !useApi || hasRound;
  const skipRoundQuery = !open || !useApi || !hasRound;

  const allQuery = useGetCandidateNotesAllQuery(cid, {
    skip: skipAllQuery,
  });

  const roundQuery = useGetRoundNotesQuery(bookingId, {
    skip: skipRoundQuery,
  });

  /** `data` can stick to the previous booking until the new request finishes; `currentData` is scoped to the active arg. On error, show no rows. */
  const allNotes = useMemo((): CandidateNoteItem[] => {
    if (hasRound || !open || !useApi) return [];
    if (allQuery.isError) return [];
    return allQuery.currentData ?? [];
  }, [hasRound, open, useApi, allQuery.isError, allQuery.currentData]);

  const roundNotes = useMemo((): CandidateNoteItem[] => {
    if (!hasRound || !open || !useApi) return [];
    if (roundQuery.isError) return [];
    return roundQuery.currentData ?? [];
  }, [hasRound, open, useApi, roundQuery.isError, roundQuery.currentData]);

  const [createNote] = useCreateJobOpeningNoteMutation();
  const [updateNote] = useUpdateJobOpeningNoteMutation();
  const [deleteNote] = useDeleteJobOpeningNoteMutation();

  const remoteActions: NotesRemoteActions | null = useMemo(() => {
    if (!useApi) return null;
    const invBase = { invalidateCandidateId: cid };
    return {
      onCreate: async (noteText: string) => {
        try {
          if (hasRound) {
            await createNote({
              parentType: 'CANDIDATE_ROUND',
              parentId: bookingId,
              noteText,
              invalidateRoundBookingId: bookingId,
              ...invBase,
            }).unwrap();
          } else {
            await createNote({
              parentType: 'CANDIDATE',
              parentId: cid,
              noteText,
              ...invBase,
            }).unwrap();
          }
        } catch (e) {
          showToast({ message: get(e, 'data.message', 'Could not save note'), type: 'error' });
          throw e;
        }
      },
      onUpdate: async (noteId: string, noteText: string) => {
        try {
          await updateNote({
            noteId: Number(noteId),
            noteText,
            ...invBase,
            ...(hasRound ? { invalidateRoundBookingId: bookingId } : {}),
          }).unwrap();
        } catch (e) {
          showToast({ message: get(e, 'data.message', 'Could not update note'), type: 'error' });
          throw e;
        }
      },
      onDelete: async (noteId: string) => {
        try {
          await deleteNote({
            noteId: Number(noteId),
            ...invBase,
            ...(hasRound ? { invalidateRoundBookingId: bookingId } : {}),
          }).unwrap();
        } catch (e) {
          showToast({ message: get(e, 'data.message', 'Could not delete note'), type: 'error' });
          throw e;
        }
      },
    };
  }, [useApi, cid, hasRound, bookingId, createNote, updateNote, deleteNote]);

  const apiNotes = hasRound ? roundNotes : allNotes;
  const notesList = useApi ? apiNotes : legacyNotes;

  const isLoadingNotes =
    useApi &&
    (hasRound
      ? !skipRoundQuery &&
        roundQuery.isFetching &&
        roundQuery.currentData === undefined &&
        !roundQuery.isError
      : !skipAllQuery &&
        allQuery.isFetching &&
        allQuery.currentData === undefined &&
        !allQuery.isError);

  const notesScopeKey = `${cid}-${hasRound ? `round-${bookingId}` : 'all'}`;

  return (
    <NotesSidePanel
      open={open}
      onClose={onClose}
      title={title}
      notes={notesList}
      emptyMessage={emptyMessage}
      emptyStateTitle={emptyStateTitle}
      emptyStateSubtitle={emptyStateSubtitle}
      composerPlaceholder={composerPlaceholder}
      variant="candidate"
      layout={layout}
      roundContext={roundContext}
      remoteActions={useApi ? remoteActions : null}
      isLoadingNotes={isLoadingNotes}
      showCandidateRoundContextLabel={useApi && !hasRound}
      notesScopeKey={notesScopeKey}
    />
  );
};

export default CandidateNotesPanel;
