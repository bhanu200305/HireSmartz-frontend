import { useMemo } from 'react';
import dayjs from 'dayjs';
import { get } from 'lodash-es';
import NotesSidePanel, { type NotesRemoteActions } from './NotesSidePanel';
import type { CandidateNoteItem } from './notesTypes';
import { showToast } from '../../shared';
import {
  useGetJobOpeningNotesQuery,
  useCreateJobOpeningNoteMutation,
  useUpdateJobOpeningNoteMutation,
  useDeleteJobOpeningNoteMutation,
} from '../../../api/job-service/JobOpening/JobOpeningNotes';
import { useListUsersQuery } from '../../../api/organization-service/Users/users';

export type { CandidateNoteItem } from './notesTypes';

export const buildJobNotesTimeline = (job: any): CandidateNoteItem[] => {
  const rawNotes =
    job?.jobNotes ||
    job?.job_notes ||
    job?.notes ||
    job?.jobOpeningNotes ||
    job?.jobNoteDtos ||
    job?.noteDtos ||
    [];

  const parseDate = (value?: string) => {
    if (!value) return 0;
    const d = dayjs(value);
    return d.isValid() ? d.valueOf() : 0;
  };

  const notes: CandidateNoteItem[] = (rawNotes || [])
    .map((note: any, index: number) => {
      const content = String(
        note?.content ?? note?.note ?? note?.description ?? note?.body ?? ''
      ).trim();
      if (!content) return null;

      return {
        id: String(note?.id ?? `job-note-${index}`),
        content,
        createdAt: note?.createdAt ?? note?.updatedAt ?? note?.timestamp ?? note?.created_at,
        authorName:
          note?.authorName ??
          note?.createdByName ??
          note?.userName ??
          note?.user?.name ??
          note?.author?.name ??
          'Unknown User',
        authorRole:
          note?.authorRole ??
          note?.createdByRole ??
          note?.role ??
          note?.user?.role ??
          note?.author?.role,
        authorId:
          Number(
            note?.authorId ??
              note?.createdById ??
              note?.createdBy ??
              note?.userId ??
              note?.user?.id ??
              note?.author?.id ??
              0
          ) || undefined,
        contextLabel: String(
          note?.contextLabel ?? note?.context ?? note?.code ?? note?.type ?? 'AS'
        ),
        roundName: note?.roundName ?? note?.round?.name ?? note?.interviewRoundName ?? undefined,
      };
    })
    .filter(Boolean) as CandidateNoteItem[];

  return notes.sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
};

export const JOB_NOTES_DUMMY: CandidateNoteItem[] = [
  {
    id: 'dummy-1',
    contextLabel: 'AS',
    authorName: 'Amit Shah',
    authorRole: 'Hiring Manager',
    authorId: 0,
    createdAt: '2026-03-17T18:09:00.000Z',
    roundName: 'AI Audio Screening',
    content: 'Please schedule an in-person interview with this candidate',
  },
  {
    id: 'dummy-2',
    contextLabel: 'RA',
    authorName: 'Raghav Arora',
    authorRole: undefined,
    authorId: 0,
    createdAt: '2026-03-10T18:09:00.000Z',
    roundName: undefined,
    content: "Please review this candidate's portfolio.",
  },
  {
    id: 'dummy-3',
    contextLabel: 'RA',
    authorName: 'Raghav Arora',
    authorRole: 'Recruiter',
    authorId: 0,
    createdAt: '2026-03-10T19:00:00.000Z',
    roundName: undefined,
    content: "Please review this candidate's portfolio (edited)",
  },
  {
    id: 'dummy-4',
    contextLabel: 'SA',
    authorName: 'Sarah Andrews',
    authorRole: 'Hiring Manager',
    authorId: 0,
    createdAt: '2026-03-05T20:00:00.000Z',
    roundName: 'In-Person Interview',
    content:
      'Looking like a great fit, but will need to complete against other offers and move quickly.(edited)',
  },
  {
    id: 'dummy-5',
    contextLabel: 'DW',
    authorName: 'Dan Williams',
    authorRole: 'Super Admin',
    authorId: 0,
    createdAt: '2026-03-01T17:00:00.000Z',
    roundName: 'AI Audio Screening',
    content: 'Can budget $40k. Check if this works.',
  },
];

export const JOB_NOTES_DUMMY_COUNT = JOB_NOTES_DUMMY.length;

type JobListingNotesPanelProps = {
  open: boolean;
  onClose: () => void;
  jobTitle?: string;
  /** When set, loads and persists notes via API. */
  jobOpeningId?: string;
  /**
   * Legacy: static notes when `jobOpeningId` is omitted (e.g. storybook).
   * Ignored when `jobOpeningId` is set.
   */
  notes?: CandidateNoteItem[];
};

const JobListingNotesPanel = ({
  open,
  onClose,
  jobTitle,
  jobOpeningId,
  notes: legacyNotes = [],
}: JobListingNotesPanelProps) => {
  const titleText = jobTitle?.trim() ? `Job Notes - ${jobTitle.trim()}` : 'Job Notes';

  const { data: apiNotesRaw = [], isFetching } = useGetJobOpeningNotesQuery(jobOpeningId!, {
    skip: !open || !jobOpeningId,
  });

  // job-service's notes only ever carry `created_by` — a raw user id, no
  // display name (see notesResponseMappers.ts's own comment) — so it's
  // resolved here, against this tenant's user list, the same list Hiring
  // Manager/Recruiter pickers already use. Skipped along with the notes
  // query itself while the panel is closed.
  const { data: usersData } = useListUsersQuery(
    { limit: 200 },
    { skip: !open || !jobOpeningId }
  );
  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of usersData?.items ?? []) {
      map.set(user.user_id, user.full_name || user.email);
    }
    return map;
  }, [usersData]);

  const apiNotes = useMemo(
    () =>
      apiNotesRaw.map((note) =>
        note.authorName
          ? note
          : {
              ...note,
              authorName:
                (note.authorId && userNameById.get(note.authorId)) || 'Unknown User',
            }
      ),
    [apiNotesRaw, userNameById]
  );

  const [createNote] = useCreateJobOpeningNoteMutation();
  const [updateNote] = useUpdateJobOpeningNoteMutation();
  const [deleteNote] = useDeleteJobOpeningNoteMutation();

  const remoteActions: NotesRemoteActions | null = useMemo(() => {
    if (!jobOpeningId) return null;
    const inv = { invalidateJobId: jobOpeningId };
    return {
      onCreate: async (noteText: string) => {
        try {
          await createNote({
            parentType: 'JOB',
            parentId: jobOpeningId,
            noteText,
            ...inv,
          }).unwrap();
        } catch (e) {
          showToast({ message: get(e, 'data.message', 'Could not save note'), type: 'error' });
          throw e;
        }
      },
      onUpdate: async (noteId: string, noteText: string) => {
        try {
          await updateNote({
            noteId: String(noteId),
            noteText,
            ...inv,
          }).unwrap();
        } catch (e) {
          showToast({ message: get(e, 'data.message', 'Could not update note'), type: 'error' });
          throw e;
        }
      },
      onDelete: async (noteId: string) => {
        try {
          await deleteNote({ noteId: String(noteId), ...inv }).unwrap();
        } catch (e) {
          showToast({ message: get(e, 'data.message', 'Could not delete note'), type: 'error' });
          throw e;
        }
      },
    };
  }, [jobOpeningId, createNote, updateNote, deleteNote]);

  const useApi = Boolean(jobOpeningId);
  const notesList = useApi ? apiNotes : legacyNotes;

  return (
    <NotesSidePanel
      open={open}
      onClose={onClose}
      title={titleText}
      notes={notesList}
      variant="job"
      remoteActions={useApi ? remoteActions : null}
      isLoadingNotes={useApi && isFetching}
      placeholderNotes={useApi ? [] : JOB_NOTES_DUMMY}
      placeholderAuthoredIndexes={useApi ? [] : [3]}
    />
  );
};

export default JobListingNotesPanel;
