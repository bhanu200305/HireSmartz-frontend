import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import NotesSidePanel, { type NotesRemoteActions } from '../../Notes/NotesSidePanel';
import type { CandidateNoteItem } from '../../Notes/notesTypes';
import { showToast } from '../../../shared';
import {
  useListRecruiterNotesQuery,
  useAddRecruiterNoteMutation,
  useEditRecruiterNoteMutation,
  useDeleteRecruiterNoteMutation,
  type RecruiterNoteView,
} from '../../../../api/candidate-service/Candidates/notes';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import { useListUsersQuery } from '../../../../api/organization-service/Users/users';

// candidate-service's own recruiter-notes CRUD
// (api/candidate-service/Candidates/notes.ts, `/candidates/{id}/notes`) —
// candidate-service owns this data (PROJECT_UNDERSTANDING.md §4's
// `CandidateRecruiterNote`).
//
// Reuses the generic, presentational `NotesSidePanel` shell.

type CandidateRecruiterNotesPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** candidate-service's real UUID, not the legacy numeric id. */
  candidateId?: string;
};

type AuthorInfo = { name: string; role: string | null };

/** `RecruiterNoteView` carries `author_id` (and sometimes `author_name`).
 * The signed-in user's own notes show "You"; everyone else's name and role
 * are resolved from this tenant's user list (same lookup the job notes
 * panel uses), falling back to "Team member" only if the author isn't in it.
 */
const toNoteItem = (
  note: RecruiterNoteView,
  currentUserId: string | null | undefined,
  userById: Map<string, AuthorInfo>
): CandidateNoteItem => {
  const user = userById.get(note.author_id);
  return {
    id: note.id,
    content: note.note,
    parentType: 'CANDIDATE',
    createdAt: note.created_at,
    authorName:
      currentUserId && note.author_id === currentUserId
        ? 'You'
        : (note.author_name ?? user?.name ?? 'Team member'),
    authorRole: user?.role || undefined,
    authorId: note.author_id,
    contextLabel: 'Candidate Note',
  };
};

const CandidateRecruiterNotesPanel = ({
  open,
  onClose,
  title,
  candidateId,
}: CandidateRecruiterNotesPanelProps) => {
  const currentUserId = useSelector((state: any) => state.LoginSlice?.userId as string | null);

  const hasCandidate = Boolean(candidateId);
  const { data, isFetching } = useListRecruiterNotesQuery(
    { candidateId: candidateId ?? '', limit: 100 },
    { skip: !open || !hasCandidate }
  );

  const { data: usersData } = useListUsersQuery({ limit: 200 }, { skip: !open || !hasCandidate });
  const userById = useMemo(() => {
    const map = new Map<string, AuthorInfo>();
    for (const user of usersData?.items ?? []) {
      map.set(user.user_id, { name: user.full_name || user.email, role: user.role });
    }
    return map;
  }, [usersData]);

  const [addNote] = useAddRecruiterNoteMutation();
  const [editNote] = useEditRecruiterNoteMutation();
  const [deleteNote] = useDeleteRecruiterNoteMutation();

  const notes = useMemo(
    () => (data?.items ?? []).map((n) => toNoteItem(n, currentUserId, userById)),
    [data, currentUserId, userById]
  );

  const remoteActions: NotesRemoteActions | null = useMemo(() => {
    if (!hasCandidate) return null;
    const cid = candidateId as string;
    return {
      onCreate: async (noteText: string) => {
        try {
          await addNote({ candidateId: cid, body: { note: noteText } }).unwrap();
        } catch (e) {
          const message = getCandidateErrorMessage(e, 'Could not save note');
          showToast({ message, type: 'error' });
          throw new Error(message);
        }
      },
      onUpdate: async (noteId: string, noteText: string) => {
        try {
          await editNote({ candidateId: cid, noteId, body: { note: noteText } }).unwrap();
        } catch (e) {
          const message = getCandidateErrorMessage(e, 'Could not update note');
          showToast({ message, type: 'error' });
          throw new Error(message);
        }
      },
      onDelete: async (noteId: string) => {
        try {
          await deleteNote({ candidateId: cid, noteId }).unwrap();
        } catch (e) {
          showToast({
            message: getCandidateErrorMessage(e, 'Could not delete note'),
            type: 'error',
          });
          throw e;
        }
      },
    };
  }, [hasCandidate, candidateId, addNote, editNote, deleteNote]);

  return (
    <NotesSidePanel
      open={open}
      onClose={onClose}
      title={title}
      notes={notes}
      variant="candidate"
      remoteActions={remoteActions}
      isLoadingNotes={hasCandidate && isFetching && !data}
      notesScopeKey={candidateId ?? 'none'}
    />
  );
};

export default CandidateRecruiterNotesPanel;
