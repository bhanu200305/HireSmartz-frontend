import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useState, useEffect } from 'react';
import {
  HiOutlineTrash,
  HiDotsVertical,
  HiOutlineMicrophone,
  HiOutlineUserCircle,
  HiOutlineVideoCamera,
  HiOutlineOfficeBuilding,
} from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';
import type { IconType } from 'react-icons';
import { DraggableItem } from '../../shared/ui/DragAndDrop';
import { showToast } from '../../shared';

type InterviewRound = {
  id: string | number;
  round: {
    id: string | number;
    name: string;
  };
  sequence: number;
  description: string;
  duration?: number | null;
  variant?: string | null;
};

/** Recruiter-facing label + icon for each real catalog variant
 * (`master_interview_round.available_variants`: AI Video round ->
 * soundwave/avatar, Hiring Panel round -> online/offline). Anything outside
 * that fixed set falls back to a plain capitalised label with no icon,
 * rather than guessing — same "don't invent it" posture as the backend's
 * own catalog-driven enforcement. */
const VARIANT_BADGES: Record<string, { label: string; icon: IconType }> = {
  soundwave: { label: 'Sound Wave Round', icon: HiOutlineMicrophone },
  avatar: { label: 'Avatar Round', icon: HiOutlineUserCircle },
  online: { label: 'Video Call Round', icon: HiOutlineVideoCamera },
  offline: { label: 'In Person Round', icon: HiOutlineOfficeBuilding },
};

/** `icon` is omitted for a variant outside the known set above — the badge
 * still renders with a label, just without a fabricated icon for a shape
 * we don't actually know the meaning of. */
const getVariantBadge = (
  variant?: string | null
): { label: string; icon: IconType | null } | null => {
  if (!variant) return null;
  const known = VARIANT_BADGES[variant.toLowerCase()];
  if (known) return known;
  const label = variant
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return { label: `${label} Round`, icon: null };
};

type SortableInterviewRoundsProps = {
  rounds: InterviewRound[];
  onRoundsReorder: (reorderedRounds: InterviewRound[]) => void;
  onEdit: (round: InterviewRound) => void;
  onDelete: (roundId: string | number) => void;
  isEditMode?: boolean;
  // Round-type ids (`round.round.id`) for the fixed Resume / Intake Call
  // anchor rounds. When supplied, a drag that would push either one out
  // of the top 2 slots is rejected instead of applied.
  anchorRoundTypeIds?: Set<string>;
};

export const SortableInterviewRounds = ({
  rounds,
  onRoundsReorder,
  onEdit,
  onDelete,
  isEditMode = false,
  anchorRoundTypeIds,
}: SortableInterviewRoundsProps) => {
  const [items, setItems] = useState<InterviewRound[]>(rounds);

  useEffect(() => {
    setItems(rounds);
  }, [rounds]);

  const reorder = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);

    return newItems.map((item, index) => ({
      ...item,
      sequence: index + 1,
    }));
  };

  /** Resume and Intake Call must always occupy the top 2 slots — either
   * one may lead, but nothing else may be dragged ahead of both of them. */
  const violatesAnchorPositions = (candidate: InterviewRound[]) => {
    if (!anchorRoundTypeIds || anchorRoundTypeIds.size === 0) return false;
    const isAnchor = (round: InterviewRound) => anchorRoundTypeIds.has(String(round.round?.id));
    const anchorCount = candidate.filter(isAnchor).length;
    if (anchorCount === 0) return false;
    const topSlots = candidate.slice(0, Math.min(2, candidate.length));
    const anchorsInTopSlots = topSlots.filter(isAnchor).length;
    return anchorsInTopSlots < Math.min(anchorCount, 2);
  };

  const handleDrop = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const reordered = reorder(fromIndex, toIndex);
    if (violatesAnchorPositions(reordered)) {
      showToast({
        message:
          'Resume and Intake Call rounds must stay the top 2 rounds. They can swap places, but no other round can be moved ahead of them.',
        type: 'error',
      });
      return;
    }
    setItems(reordered);
    onRoundsReorder(reordered);
  };

  const renderCardBody = (round: InterviewRound, index: number, isOver = false) => {
    const badge = getVariantBadge(round.variant);
    const BadgeIcon = badge?.icon;
    const summary = [
      `Type: ${round.round?.name}`,
      badge ? `Format: ${badge.label}` : null,
      round.duration ? `${round.duration} min` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <div
        className={`border shadow-sm rounded-2xl px-6 py-4 bg-white transition-all duration-200 flex items-center justify-between gap-4 ${
          isOver ? 'border-primary' : 'border-[var(--border)]'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="text-base font-semibold text-neutral-900">
              {index + 1}. {round.round?.name}
            </h3>
            {badge && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                {BadgeIcon && <BadgeIcon className="text-sm shrink-0" />}
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1 truncate">{summary}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => onEdit(round)}
            className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
            aria-label="Edit round"
          >
            <MdEdit size={18} />
          </button>
          <button
            className="text-red-500 hover:text-red-700 cursor-pointer"
            onClick={() => onDelete(round.id)}
            aria-label="Delete round"
          >
            <HiOutlineTrash size={18} />
          </button>
        </div>
      </div>
    );
  };

  if (isEditMode) {
    return (
      <div className="space-y-4 pb-4">
        {items.map((round, index) => (
          <div key={round.id}>{renderCardBody(round, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 pb-4">
        {items.map((round, index) => (
          <div key={round.id} className="flex items-start gap-3">
            <DraggableItem
              item={round}
              index={index}
              moveItem={handleDrop}
              renderDragHandle={false}
            >
              {() => (
                <div className="cursor-move flex items-center justify-center bg-[#E5E5E5] rounded-full p-2 shadow-sm h-8 w-8 mt-1">
                  <div className="relative" style={{ width: '12px', height: '20px' }}>
                    <HiDotsVertical className="absolute left-0" style={{ fontSize: '20px' }} />
                    <HiDotsVertical className="absolute right-0" style={{ fontSize: '20px' }} />
                  </div>
                </div>
              )}
            </DraggableItem>

            <div className="flex-1">
              <DraggableItem
                item={round}
                index={index}
                moveItem={handleDrop}
                renderDragHandle={false}
              >
                {({ isOver }) => renderCardBody(round, index, isOver)}
              </DraggableItem>
            </div>
          </div>
        ))}
      </div>
    </DndProvider>
  );
};
