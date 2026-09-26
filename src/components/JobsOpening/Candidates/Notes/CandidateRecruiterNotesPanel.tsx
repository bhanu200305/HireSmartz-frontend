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

/** `RecruiterNoteView` has no author display name/role — only `author_id`
 * (a UUID from the JWT, per API_CONTRACT.md). There's no lookup endpoint
 * this panel can call to resolve an arbitrary author id to a name, so:
 * the signed-in user's own notes show "You"; everyone else's show a plain
 * "Team member" placeholder rather than a fabricated name. Flagged here,
 * not silently faked.
 */
const toNoteItem = (note: RecruiterNoteView, currentUserId?: string | null): CandidateNoteItem => ({
  id: note.id,
  content: note.note,
  parentType: 'CANDIDATE',
  createdAt: note.created_at,
  authorName: currentUserId && note.author_id === currentUserId ? 'You' : 'Team member',
  authorId: note.author_id,
  contextLabel: 'Candidate Note',
});

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

  const [addNote] = useAddRecruiterNoteMutation();
  const [editNote] = useEditRecruiterNoteMutation();
  const [deleteNote] = useDeleteRecruiterNoteMutation();

  const notes = useMemo(
    () => (data?.items ?? []).map((n) => toNoteItem(n, currentUserId)),
    [data, currentUserId]
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
