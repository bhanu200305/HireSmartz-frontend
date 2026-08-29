import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useState, useEffect } from 'react';
import { HiOutlineMinus, HiOutlinePlus, HiOutlineTrash, HiDotsVertical } from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';
import { DraggableItem } from '../../shared/ui/DragAndDrop';

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

/** "sound-wave" / "SOUND_WAVE" → "Sound Wave" — purely a display label, no
 * change to the underlying value stored/sent anywhere. */
const formatVariantLabel = (variant?: string | null): string | null => {
  if (!variant) return null;
  return variant
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
};

type SortableInterviewRoundsProps = {
  rounds: InterviewRound[];
  onRoundsReorder: (reorderedRounds: InterviewRound[]) => void;
  onEdit: (round: InterviewRound) => void;
  onDelete: (roundId: string | number) => void;
  isEditMode?: boolean;
};

export const SortableInterviewRounds = ({
  rounds,
  onRoundsReorder,
  onEdit,
  onDelete,
  isEditMode = false,
}: SortableInterviewRoundsProps) => {
  const [items, setItems] = useState<InterviewRound[]>(rounds);
  const [collapsedRounds, setCollapsedRounds] = useState<string[]>([]);

  useEffect(() => {
    setItems(rounds);
  }, [rounds]);

  const moveRound = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);

    const updatedItems = newItems.map((item, index) => ({
      ...item,
      sequence: index + 1,
    }));

    setItems(updatedItems);
    return updatedItems;
  };

  const handleDrop = (fromIndex: number, toIndex: number) => {
    if (fromIndex !== toIndex) {
      const updatedItems = moveRound(fromIndex, toIndex);
      onRoundsReorder(updatedItems);
    }
  };

  const toggleRound = (roundId: string) => {
    setCollapsedRounds((prev) =>
      prev.includes(roundId) ? prev.filter((id) => id !== roundId) : [...prev, roundId]
    );
  };

  if (isEditMode) {
    return (
      <div className="space-y-6 pb-4">
        {items.map((round, index) => (
          <div
            key={round.id}
            className="border border-[var(--border)] shadow-lg rounded-lg p-6 bg-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {index + 1}. {round.round?.name}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {[
                    formatVariantLabel(round.variant),
                    round.duration ? `${round.duration} min` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button onClick={() => toggleRound(round.id.toString())}>
                  {collapsedRounds.includes(round.id.toString()) ? (
                    <HiOutlinePlus className="cursor-pointer" />
                  ) : (
                    <HiOutlineMinus className="cursor-pointer" />
                  )}
                </button>
                <button onClick={() => onEdit(round)}>
                  <MdEdit size={18} />
                </button>
                <button
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                  onClick={() => onDelete(round.id)}
                >
                  <HiOutlineTrash size={18} />
                </button>
              </div>
            </div>
            {!collapsedRounds.includes(round.id.toString()) && (
              <div className="border border-[var(--border)] p-6 mt-2 rounded-lg shadow-md">
                <p className="break-words">{round.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6 pb-4">
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
                {({ isOver }) => (
                  <div
                    className={`border shadow-lg rounded-lg p-6 bg-white transition-all duration-200 ${
                      isOver ? 'border-primary' : 'border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="cursor-pointer"
                        onClick={() => toggleRound(round.id.toString())}
                      >
                        <h3 className="text-lg font-semibold">
                          {index + 1}. {round.round?.name}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {[
                            formatVariantLabel(round.variant),
                            round.duration ? `${round.duration} min` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button onClick={() => toggleRound(round.id.toString())}>
                          {collapsedRounds.includes(round.id.toString()) ? (
                            <HiOutlinePlus className="cursor-pointer" />
                          ) : (
                            <HiOutlineMinus className="cursor-pointer" />
                          )}
                        </button>
                        <button onClick={() => onEdit(round)}>
                          <MdEdit size={18} />
                        </button>
                        <button
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                          onClick={() => onDelete(round.id)}
                        >
                          <HiOutlineTrash size={18} />
                        </button>
                      </div>
                    </div>
                    {!collapsedRounds.includes(round.id.toString()) && (
                      <div className="border border-[var(--border)] p-6 mt-2 rounded-lg shadow-md">
                        <p className="break-words">{round.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </DraggableItem>
            </div>
          </div>
        ))}
      </div>
    </DndProvider>
  );
};
