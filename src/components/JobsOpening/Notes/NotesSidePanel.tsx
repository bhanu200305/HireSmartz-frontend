import { Button, Drawer, Dropdown, MenuProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { IoPaperPlaneOutline } from 'react-icons/io5';
import { LuFiles } from 'react-icons/lu';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { safeDecodeToken } from '../../../shared/utils/methods';
import type { CandidateNoteItem } from './notesTypes';
import { NOTES_ACCENT } from './NotesPillTrigger';

export type NotesSidePanelVariant = 'job' | 'candidate';

export type NotesRoundContext = {
  roundId: number;
  roundName: string;
};

/** When set, create/update/delete call the API; parent refetches via RTK invalidation. */
export type NotesRemoteActions = {
  onCreate: (content: string) => Promise<void>;
  onUpdate: (noteId: string, content: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
};

const DEFAULT_EMPTY_STATE_TITLE = 'No notes have been added here.';
const DEFAULT_EMPTY_STATE_SUBTITLE =
  'Add internal notes. Visible only to users with access to this job opening.';
const DEFAULT_COMPOSER_PLACEHOLDER = 'Add notes here.';

export type NotesSidePanelProps = {
  open: boolean;
  onClose: () => void;
  /** Single-line drawer title, e.g. "Job Notes - Account Manager" or "Candidate Notes - Jane Doe" */
  title: string;
  notes: CandidateNoteItem[];
  /**
   * Legacy override for the empty-state supporting line when `emptyStateSubtitle` is not set
   * (job and candidate).
   */
  emptyMessage?: string;
  /** Empty-state heading when there are no notes (Figma; job and candidate). */
  emptyStateTitle?: string;
  /** Empty-state supporting copy (Figma; job and candidate). */
  emptyStateSubtitle?: string;
  /** Placeholder in the add-note field (Figma). */
  composerPlaceholder?: string;
  variant: NotesSidePanelVariant;
  /** Job only: when API notes are empty, show these (e.g. demo data). Ignored for candidate. */
  placeholderNotes?: CandidateNoteItem[];
  /** Job only: indices in placeholderNotes treated as authored by current user (menu + authorId). */
  placeholderAuthoredIndexes?: number[];
  /**
   * `compact` = shorter drawer + tighter cards (e.g. round-scoped candidate notes).
   * Usually pass `layout="compact"` together with `roundContext` for per-round notes.
   */
  layout?: 'default' | 'compact';
  /**
   * Candidate variant: new notes are tagged to this round (roundId / roundName / pill).
   * Ignored for job notes.
   */
  roundContext?: NotesRoundContext | null;
  /** Persist notes via API; job placeholders are not used when this is set. */
  remoteActions?: NotesRemoteActions | null;
  /** Optional loading state while notes are fetched (e.g. first open). */
  isLoadingNotes?: boolean;
  /** Candidate-all only: show blue pill from contextLabel when parentType is CANDIDATE_ROUND. */
  showCandidateRoundContextLabel?: boolean;
  /**
   * Candidate / API: include in sync key so switching scope (e.g. round booking id) resets list
   * even when RTK briefly exposes the wrong cache entry.
   */
  notesScopeKey?: string;
  /** Job only: false hides the composer and edit/delete menu, read-only. */
  canWrite?: boolean;
};

const parseDate = (value?: string) => {
  if (!value) return 0;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.valueOf() : 0;
};

const sortNewestFirst = (items: CandidateNoteItem[]) =>
  [...items].sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));

function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (name.slice(0, 2) || '??').toUpperCase();
}

function avatarColorsForInitials(initials: string): { bg: string; fg: string } {
  const u = initials.toUpperCase();
  if (u === 'SA') return { bg: '#e6f4f1', fg: '#3d8c7a' };
  if (u === 'DW') return { bg: '#E3F2FD', fg: '#1565C0' };
  if (u === 'RA') return { bg: '#e6f0ff', fg: NOTES_ACCENT };
  if (u === 'AS') return { bg: '#e6f4f1', fg: '#2d7a6c' };
  return { bg: '#F3F4F6', fg: '#4b5563' };
}

function isHiringManagerRole(role?: string): boolean {
  if (!role?.trim()) return false;
  return /hiring\s*manager/i.test(role.trim());
}

function normalizeIdentityText(value?: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function applyPlaceholderAuthorship(
  placeholders: CandidateNoteItem[],
  indexes: number[],
  currentUserId: string
): CandidateNoteItem[] {
  return placeholders.map((n, idx) => ({
    ...n,
    // Local demo data only (used when there's no real backend behind this
    // panel) — just needs an id that does/doesn't match the signed-in
    // user, not a real one.
    authorId: indexes.includes(idx) ? currentUserId || 'placeholder-you' : 'placeholder-other',
  }));
}

const NotesSidePanel = ({
  open,
  onClose,
  title,
  notes: notesProp,
  emptyMessage,
  emptyStateTitle = DEFAULT_EMPTY_STATE_TITLE,
  emptyStateSubtitle: emptyStateSubtitleProp,
  composerPlaceholder = DEFAULT_COMPOSER_PLACEHOLDER,
  variant,
  placeholderNotes = [],
  placeholderAuthoredIndexes = [],
  layout = 'default',
  roundContext = null,
  remoteActions = null,
  isLoadingNotes = false,
  showCandidateRoundContextLabel = false,
  notesScopeKey = '',
  canWrite = true,
}: NotesSidePanelProps) => {
  const isJob = variant === 'job';
  const useRemote = Boolean(remoteActions);
  /**
   * While closing, parent often clears round scope in the same update as `open={false}`, so `layout`
   * flips to `default` before the exit animation finishes. That drops compact wrapper height and the
   * drawer briefly snaps to full viewport height. Keep the last in-open layout until the next open.
   */
  const layoutWhileOpenRef = useRef<'default' | 'compact'>(layout);
  useEffect(() => {
    if (open) {
      layoutWhileOpenRef.current = layout;
    }
  }, [open, layout]);
  const isCompact = open ? layout === 'compact' : layoutWhileOpenRef.current === 'compact';
  const { loginToken, role } = useSelector((state: any) => state.LoginSlice);
  const roleName = typeof role?.name === 'string' ? role.name.trim() : '';
  const currentUser = safeDecodeToken<{
    userId?: number | string;
    firstName?: string;
    lastName?: string;
    userName?: string;
  }>(loginToken);
  // Compared by string equality against `note.authorId` below — the
  // JWT's `userId` is a UUID for every real session in this app, so
  // running it through `Number()` (as this used to) was always `NaN` and
  // "is this my note" never matched.
  const currentUserId = currentUser?.userId != null ? String(currentUser.userId) : '';
  const currentUserName =
    `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'You';
  const currentUserNameNorm = normalizeIdentityText(currentUserName);
  const currentUserHandleNorm = normalizeIdentityText(currentUser?.userName);

  const patchedPlaceholders = useMemo(
    () => applyPlaceholderAuthorship(placeholderNotes, placeholderAuthoredIndexes, currentUserId),
    [placeholderNotes, placeholderAuthoredIndexes, currentUserId]
  );

  const bootstrapNotes = useMemo(() => {
    const apiNotes = (notesProp || []).filter(
      (n) => (n.content ?? '').toString().trim().length > 0
    );
    if (isJob) {
      if (apiNotes.length > 0) return sortNewestFirst(apiNotes);
      if (!useRemote && patchedPlaceholders.length > 0) return sortNewestFirst(patchedPlaceholders);
      return [];
    }
    return sortNewestFirst(apiNotes);
  }, [isJob, notesProp, patchedPlaceholders, useRemote]);

  /** Stable across parent re-renders so we do not reset the composer when only the notes array reference changes. */
  const notesSourceKey = useMemo(() => {
    const rows = (notesProp || []).map((n) => [
      n.id,
      n.createdAt ?? '',
      n.content ?? '',
      n.authorId ?? '',
      n.roundId ?? '',
    ]);
    const apiKey = JSON.stringify(rows);
    if (!isJob) return `${notesScopeKey}|${apiKey}`;
    const usePh = !useRemote && rows.length === 0 && patchedPlaceholders.length > 0;
    const phKey = usePh
      ? JSON.stringify(patchedPlaceholders.map((p) => [p.id, p.authorId ?? '']))
      : '';
    return `${apiKey}|ph:${phKey}|uid:${currentUserId}`;
  }, [notesProp, isJob, patchedPlaceholders, currentUserId, useRemote, notesScopeKey]);

  const bootstrapRef = useRef(bootstrapNotes);
  bootstrapRef.current = bootstrapNotes;

  const [notesState, setNotesState] = useState<CandidateNoteItem[]>(bootstrapNotes);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [, setDeletingId] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setNotesState(bootstrapRef.current);
  }, [open, notesSourceKey]);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setNewNoteContent('');
      setEditingNoteId(null);
      setEditingContent('');
      setComposerError(null);
      setEditError(null);
    }
    prevOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const listNotes = notesState;

  const handlePost = async () => {
    const content = newNoteContent.trim();
    if (!content || isPosting) return;

    if (remoteActions) {
      setIsPosting(true);
      setComposerError(null);
      try {
        await remoteActions.onCreate(content);
        setNewNoteContent('');
      } catch (e) {
        setComposerError(e instanceof Error ? e.message : 'Could not save note.');
      } finally {
        setIsPosting(false);
      }
      return;
    }

    const nowIso = new Date().toISOString();
    const authorId = currentUserId || undefined;

    const newNote: CandidateNoteItem = isJob
      ? {
          id: `job-note-${nowIso}`,
          contextLabel: 'AS',
          content,
          createdAt: nowIso,
          authorName: currentUserName,
          authorRole: 'Hiring Manager',
          authorId,
          roundName: 'AI Audio Screening',
        }
      : {
          id: `candidate-note-${nowIso}`,
          contextLabel: roundContext?.roundName?.trim() || 'Candidate Note',
          content,
          createdAt: nowIso,
          authorName: currentUserName,
          authorRole: roleName || undefined,
          authorId,
          roundId: roundContext?.roundId,
          roundName: roundContext?.roundName?.trim() || undefined,
        };

    setNotesState((prev) => sortNewestFirst([newNote, ...prev]));
    setNewNoteContent('');
  };

  const handleDelete = async (note: CandidateNoteItem) => {
    if (remoteActions) {
      // `remoteActions` set means `note` came from a real API response,
      // never a local placeholder — no need to also demand its id look
      // numeric (job-service's are UUIDs; this used to reject every real
      // job note here).
      if (!note.id) return;
      setDeletingId(note.id);
      try {
        await remoteActions.onDelete(note.id);
        if (editingNoteId === note.id) {
          setEditingNoteId(null);
          setEditingContent('');
        }
      } finally {
        setDeletingId(null);
      }
      return;
    }

    setNotesState((prev) => sortNewestFirst(prev.filter((n) => n.id !== note.id)));
    if (editingNoteId === note.id) {
      setEditingNoteId(null);
      setEditingContent('');
    }
  };

  const handleStartEdit = (note: CandidateNoteItem) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    setEditError(null);
  };

  const handleSaveEdit = async (note: CandidateNoteItem) => {
    const content = editingContent.trim();
    if (!content || isSavingEdit) return;

    if (remoteActions) {
      // Same reasoning as handleDelete above.
      if (!note.id) return;
      setIsSavingEdit(true);
      setEditError(null);
      try {
        await remoteActions.onUpdate(note.id, content);
        setEditingNoteId(null);
        setEditingContent('');
      } catch (e) {
        setEditError(e instanceof Error ? e.message : 'Could not update note.');
      } finally {
        setIsSavingEdit(false);
      }
      return;
    }

    const nowIso = new Date().toISOString();
    setNotesState((prev) =>
      sortNewestFirst(
        prev.map((n) =>
          n.id === note.id
            ? {
                ...n,
                content,
                createdAt: nowIso,
              }
            : n
        )
      )
    );
    setEditingNoteId(null);
    setEditingContent('');
  };

  const drawerTitle = (
    <div className="pr-2 min-w-0 mr-2">
      <div
        className={`font-bold text-gray-900 leading-tight truncate ${isCompact ? 'text-base' : 'text-lg'}`}
        title={title}
      >
        {title}
      </div>
    </div>
  );

  const resolvedEmptySubtitle =
    emptyStateSubtitleProp ?? emptyMessage ?? DEFAULT_EMPTY_STATE_SUBTITLE;

  return (
    <Drawer
      title={drawerTitle}
      placement="right"
      width={isCompact ? 480 : 560}
      onClose={onClose}
      open={open}
      destroyOnClose
      closable
      headerStyle={{ backgroundColor: '#F5F5F5', borderBottom: '1px solid #e8eaed' }}
      styles={{
        header: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...(isCompact ? { paddingTop: 12, paddingBottom: 12 } : {}),
        },
        body: {
          padding: 0,
          paddingBottom: 0,
          backgroundColor: '#f5f7fa',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        },
        ...(isCompact
          ? {
              wrapper: {
                top: 'auto',
                bottom: 0,
                maxHeight: 'min(480px, 72vh)',
                height: 'min(480px, 72vh)',
                paddingBottom: 0,
              },
            }
          : {}),
      }}
    >
      <div className="flex flex-col min-h-0 h-full max-h-full">
        <div
          className={`flex-1 min-h-0 overflow-y-auto px-4 space-y-0 ${isCompact ? 'py-3' : 'py-4'}`}
        >
          {isLoadingNotes ? (
            <div
              className={`flex flex-col items-center justify-center text-[#717171] text-sm ${isCompact ? 'py-6' : 'py-10'}`}
            >
              Loading notes…
            </div>
          ) : listNotes.length > 0 ? (
            listNotes.map((note) => {
              const initials = getAuthorInitials(note.authorName);
              const { bg: avBg, fg: avFg } = avatarColorsForInitials(initials);

              const byId =
                currentUserId.length > 0 && !!note.authorId && note.authorId === currentUserId;
              const noteAuthorNameNorm = normalizeIdentityText(note.authorName);
              const byName =
                noteAuthorNameNorm.length > 0 &&
                (noteAuthorNameNorm === currentUserNameNorm ||
                  (currentUserHandleNorm.length > 0 &&
                    noteAuthorNameNorm === currentUserHandleNorm));
              const isAuthor = byId || byName;

              const roleText = note.authorRole?.trim();
              const isHmCard = isHiringManagerRole(roleText);
              const contextLabel = String(note.contextLabel ?? '').trim();
              const parentType = String(note.parentType ?? '')
                .trim()
                .toUpperCase();
              const tagLabel =
                showCandidateRoundContextLabel && parentType === 'CANDIDATE_ROUND' && contextLabel
                  ? contextLabel
                  : note.roundName?.trim() || '';
              const showTag = Boolean(tagLabel);

              const timeStr = note.createdAt
                ? dayjs(note.createdAt).format('MMM D, YYYY, h:mm a')
                : '';

              const menuItems: MenuProps['items'] = [
                { key: 'edit', label: 'Edit' },
                { key: 'delete', label: 'Delete' },
              ];

              const showAuthorMenu = isAuthor && canWrite;

              return (
                <div key={note.id} className={isCompact ? 'mb-3 last:mb-1' : 'mb-4 last:mb-2'}>
                  <div
                    className={`rounded-lg flex flex-col min-h-0 ${
                      isCompact ? 'px-3 py-3' : 'px-4 py-4'
                    } ${
                      isHmCard
                        ? 'border border-[#c7d9f7] bg-[#F0F7FF] shadow-sm'
                        : 'border border-[#e0e0e0] bg-white shadow-sm'
                    }`}
                  >
                    <div
                      className={`flex items-start flex-1 min-h-0 ${isCompact ? 'gap-2.5' : 'gap-3'}`}
                    >
                      <div
                        className={`shrink-0 rounded-full flex items-center justify-center font-semibold ${
                          isCompact ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm'
                        }`}
                        style={{ backgroundColor: avBg, color: avFg }}
                        aria-hidden
                      >
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={`min-w-0 leading-snug pt-0.5 ${isCompact ? 'text-[14px]' : 'text-[15px]'}`}
                          >
                            <span className="font-bold text-gray-900">{note.authorName}</span>
                            {roleText ? (
                              <span
                                className={`font-normal text-[#717171] ${isCompact ? 'text-[12px]' : 'text-[13px]'}`}
                              >
                                {' '}
                                ({roleText})
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {showTag ? (
                              <span
                                className={`inline-flex items-center max-w-[200px] rounded-full border border-primary-600 bg-white font-medium text-primary-600 truncate ${
                                  isCompact ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
                                }`}
                              >
                                <span className="truncate" title={tagLabel}>
                                  {tagLabel}
                                </span>
                              </span>
                            ) : null}
                            {showAuthorMenu ? (
                              <Dropdown
                                menu={{
                                  items: menuItems,
                                  onClick: ({ key }) => {
                                    if (key === 'edit') handleStartEdit(note);
                                    if (key === 'delete') void handleDelete(note);
                                  },
                                }}
                                trigger={['click']}
                                placement="bottomRight"
                              >
                                <button
                                  type="button"
                                  className="shrink-0 p-1 rounded-md text-[#717171] hover:bg-black/[0.06] cursor-pointer"
                                  aria-label="Note actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreOutlined className="text-base" />
                                </button>
                              </Dropdown>
                            ) : null}
                          </div>
                        </div>

                        {editingNoteId === note.id ? (
                          <div className="mt-2">
                            <textarea
                              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
                              rows={3}
                              value={editingContent}
                              onChange={(e) => {
                                setEditingContent(e.target.value);
                                if (editError) setEditError(null);
                              }}
                            />
                            {editError && (
                              <p className="text-red-500 text-sm px-2 py-1">{editError}</p>
                            )}
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <Button
                                size="small"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditError(null);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="small"
                                type="primary"
                                loading={isSavingEdit}
                                onClick={() => void handleSaveEdit(note)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className={`mt-2 mb-0 leading-relaxed text-[#4f4f4f] whitespace-pre-wrap break-words ${
                              isCompact ? 'text-[13px]' : 'text-[14px]'
                            }`}
                          >
                            {note.content}
                          </p>
                        )}

                        {timeStr ? (
                          <div
                            className={`text-right text-[#828282] whitespace-nowrap ${isCompact ? 'mt-2 pt-0.5 text-[11px]' : 'mt-3 pt-1 text-[12px]'}`}
                          >
                            {timeStr}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : null}
        </div>

        <div
          className={`relative z-10 px-4 bg-[#f5f7fa] shrink-0 ${isCompact ? 'pt-2 pb-1.5' : 'pt-3 pb-2'} ${
            isLoadingNotes || listNotes.length > 0 ? 'border-t border-[#e8eaed]' : ''
          }`}
        >
          {!isLoadingNotes && listNotes.length === 0 ? (
            <div
              className={`flex flex-col items-center text-center px-1 ${isCompact ? 'pb-3 pt-1' : 'pb-4 pt-2'}`}
            >
              <LuFiles
                className="text-[#9ca3af] mb-3 shrink-0"
                size={isCompact ? 40 : 48}
                strokeWidth={1.25}
                aria-hidden
              />
              <p
                className={`font-semibold text-gray-900 mb-1.5 ${isCompact ? 'text-[15px]' : 'text-base'}`}
              >
                {emptyStateTitle}
              </p>
              <p
                className={`text-[#717171] max-w-[320px] mx-auto leading-snug ${isCompact ? 'text-[13px]' : 'text-sm'}`}
              >
                {resolvedEmptySubtitle}
              </p>
            </div>
          ) : null}
          {canWrite ? (
            <div className="relative z-10">
              <textarea
                className={`relative z-10 w-full border border-gray-300 rounded-lg pr-12 pb-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-600/40 ${
                  isCompact ? 'p-2 min-h-[64px]' : 'p-2.5'
                }`}
                rows={isCompact ? 2 : 3}
                placeholder={composerPlaceholder}
                value={newNoteContent}
                onChange={(e) => {
                  setNewNoteContent(e.target.value);
                  if (composerError) setComposerError(null);
                }}
              />
              <button
                type="button"
                className="absolute z-20 text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed bottom-2.5 right-3 pointer-events-auto p-0.5 rounded-md hover:bg-primary-600/10 transition-colors"
                onClick={() => void handlePost()}
                disabled={!newNoteContent.trim() || isPosting}
                aria-label="Post note"
              >
                <IoPaperPlaneOutline size={isCompact ? 20 : 22} aria-hidden />
              </button>
              {composerError && (
                <p className="text-red-500 text-sm px-2 py-1">{composerError}</p>
              )}
              <p className="text-xs text-gray-400 px-2 py-1">
                Do not include discriminatory, abusive, or hateful language.
              </p>
            </div>
          ) : (
            <p
              className={`text-center text-[#717171] ${isCompact ? 'text-[12px] pb-2' : 'text-sm pb-3'}`}
            >
              You can only add notes to jobs you&apos;re assigned to.
            </p>
          )}
          <div
            className={`flex items-center justify-between text-gray-400 ${isCompact ? 'text-[11px] mt-1' : 'text-xs mt-2'}`}
          >
            <span>
              {listNotes.length} Note{listNotes.length === 1 ? '' : 's'}
            </span>
            <span>Press Esc button to close</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default NotesSidePanel;
