import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useState, useEffect } from 'react';
import { Tooltip } from 'antd';
import {
  HiOutlineTrash,
  HiDotsVertical,
  HiOutlineMicrophone,
  HiOutlineUserCircle,
} from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';
import type { IconType } from 'react-icons';
import { DraggableItem } from '../../shared/ui/DragAndDrop';
import { showToast } from '../../shared';
import RoundInfoButton from '../../shared/ui/RoundInfoButton';
import { getRoundInfoSections } from '../../../shared/utils/roundInfoContent';
import { resolveVariantLabel } from '../../../shared/utils/variantLabel';

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

/** Icon per variant code; text comes from the database. */
const VARIANT_ICONS: Record<string, IconType> = {
  soundwave: HiOutlineMicrophone,
  avatar: HiOutlineUserCircle,
};

export const getVariantBadge = (
  variant?: string | null,
  overrides?: Record<string, string> | null
): { label: string; icon: IconType | null } | null => {
  if (!variant) return null;
  return {
    label: resolveVariantLabel(variant, overrides),
    icon: VARIANT_ICONS[variant.toLowerCase()] ?? null,
  };
};

type SortableInterviewRoundsProps = {
  rounds: InterviewRound[];
  onRoundsReorder: (reorderedRounds: InterviewRound[]) => void;
  onEdit: (round: InterviewRound) => void;
  onDelete: (roundId: string | number) => void;
  isEditMode?: boolean;
  // Round-type ids for anchor rounds (Resume as round 1, plus the optional
  // Intake Call as round 2) — see `violatesAnchorPositions`.
  anchorRoundTypeIds?: Set<string>;
  // Anchor round types that are optional (Intake Call): still pinned, but
  // removable, so they keep a delete control. Never editable/retypeable.
  removableAnchorRoundTypeIds?: Set<string>;
  // Variant display text, merged across round types.
  variantLabelOverrides?: Record<string, string>;
  // Catalog round types, for each round's description and kind in its info popup.
  roundTypes?: { id: string | number; description?: string; special_kind?: string | null }[];
};

export const SortableInterviewRounds = ({
  rounds,
  onRoundsReorder,
  onEdit,
  onDelete,
  isEditMode = false,
  anchorRoundTypeIds,
  removableAnchorRoundTypeIds,
  variantLabelOverrides,
  roundTypes,
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

  /** The anchor rounds are fixed: Resume is always round 1 and, when the job
   * has one, the Intake Call is always round 2. They can't swap, and nothing
   * else may be dragged ahead of them. (Which one a candidate starts with is
   * the candidate's choice when applying; it never changes this setup.) */
  const violatesAnchorPositions = (candidate: InterviewRound[]) => {
    if (!anchorRoundTypeIds || anchorRoundTypeIds.size === 0) return false;
    const isAnchor = (round: InterviewRound) => anchorRoundTypeIds.has(String(round.round?.id));
    const isIntake = (round: InterviewRound) =>
      Boolean(removableAnchorRoundTypeIds?.has(String(round.round?.id)));
    const anchorCount = candidate.filter(isAnchor).length;
    if (anchorCount === 0) return false;
    if (!candidate.slice(0, anchorCount).every(isAnchor)) return true;
    // Resume (an anchor that isn't the Intake Call) must be first; the Intake
    // Call, if present, second.
    if (isIntake(candidate[0])) return true;
    return anchorCount > 1 && !isIntake(candidate[1]);
  };

  const handleDrop = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const reordered = reorder(fromIndex, toIndex);
    if (violatesAnchorPositions(reordered)) {
      const hasIntake = reordered.some((round) =>
        removableAnchorRoundTypeIds?.has(String(round.round?.id))
      );
      showToast({
        message: hasIntake
          ? 'Resume Review must stay round 1 and the Intake Call round 2. No other round can be moved ahead of them.'
          : 'Resume Review must stay round 1. No other round can be moved ahead of it.',
        type: 'error',
      });
      return;
    }
    setItems(reordered);
    onRoundsReorder(reordered);
  };

  const renderCardBody = (round: InterviewRound, index: number, isOver = false) => {
    const badge = getVariantBadge(round.variant, variantLabelOverrides);
    const roundType = roundTypes?.find((type) => String(type.id) === String(round.round?.id));
    const BadgeIcon = badge?.icon;
    const summary = round.duration ? `${round.duration} min` : '';
    // Anchor rounds are never edited/retyped here. Resume is mandatory, so it
    // gets no controls at all; the optional Intake Call can still be deleted.
    const isAnchorRound = anchorRoundTypeIds?.has(String(round.round?.id)) ?? false;
    const isRemovableAnchor = removableAnchorRoundTypeIds?.has(String(round.round?.id)) ?? false;

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
            {summary && <span className="text-sm text-neutral-500">{summary}</span>}
            <RoundInfoButton
              roundName={round.round?.name ?? 'Interview round'}
              badgeLabel={badge?.label}
              description={round.description}
              sections={getRoundInfoSections({
                specialKind: roundType?.special_kind,
                roundName: round.round?.name,
                variants: [round.variant],
                description: roundType?.description,
              })}
              ariaLabel={`About the ${round.round?.name} round`}
            />
          </div>
          {round.description && (
            <p className="text-sm text-neutral-500 mt-1 truncate">{round.description}</p>
          )}
        </div>
        {(!isAnchorRound || isRemovableAnchor) && (
          <div className="flex items-center gap-4 shrink-0">
            {!isAnchorRound && (
              <Tooltip title="Edit Round">
                <button
                  onClick={() => onEdit(round)}
                  className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
                  aria-label="Edit round"
                >
                  <MdEdit size={18} />
                </button>
              </Tooltip>
            )}
            <Tooltip title="Delete Round">
              <button
                className="text-gray-600 hover:text-red-600 cursor-pointer transition-colors"
                onClick={() => onDelete(round.id)}
                aria-label="Delete round"
              >
                <HiOutlineTrash size={18} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    );
  };

  if (isEditMode) {
    return (
      <>
        <div className="space-y-4 pb-4">
          {items.map((round, index) => (
            <div key={round.id}>{renderCardBody(round, index)}</div>
          ))}
        </div>
      </>
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

            <div className="min-w-0 flex-1">
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
