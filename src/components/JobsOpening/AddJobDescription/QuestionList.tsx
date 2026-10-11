import { useState, useEffect, type Ref } from 'react';
import { Tooltip } from 'antd';
import { MdClose, MdSearch } from 'react-icons/md';
import { HiDotsVertical } from 'react-icons/hi';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableItem } from '../../shared/ui/DragAndDrop';
import QuestionRowItem from './QuestionRowItem';

interface ListQuestion {
  id: string;
  question_text: string;
}

interface QuestionListProps<Question extends ListQuestion> {
  questions: Question[];
  selectedIds: string[];
  isLoading: boolean;
  /** True while a server-side search request is in-flight — shows shimmer rows. */
  isSearchLoading?: boolean;
  listRef?: Ref<HTMLDivElement>;
  /** Controlled search value — managed per-round by the parent. */
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelectionChange: (ids: string[]) => void;
  /** Synchronous local-draft save — no API call. */
  onLocalEdit: (question: Question, newText: string) => void;
  onDelete: (id: string) => void;
  onDeleteSelected: () => void;
  /** Called after a drag-drop reorder with the new question order. */
  onReorder?: (reorderedQuestions: Question[]) => void;
}

// Widths used to vary shimmer text bars so they look like real sentences.
const SHIMMER_WIDTHS = ['75%', '100%', '66%', '85%', '58%'];

const QuestionRowShimmer = ({ index }: { index: number }) => (
  <div className="flex items-center gap-2 animate-pulse">
    {/* drag handle placeholder */}
    <div className="w-8 h-8 shrink-0 rounded-full bg-gray-200" />
    {/* card */}
    <div className="flex-1 min-w-0 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-2.5">
      {/* checkbox */}
      <div className="h-4 w-4 shrink-0 rounded bg-gray-200" />
      {/* number */}
      <div className="h-4 w-5 shrink-0 rounded bg-gray-200" />
      {/* text bar — varying width for natural look */}
      <div
        className="h-4 rounded-full bg-gray-200"
        style={{ width: SHIMMER_WIDTHS[index % SHIMMER_WIDTHS.length] }}
      />
      {/* action icon placeholders */}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="h-4 w-4 rounded bg-gray-200" />
        <div className="h-4 w-4 rounded bg-gray-200" />
      </div>
    </div>
  </div>
);

export default function QuestionList<Question extends ListQuestion>({
  questions,
  selectedIds,
  isLoading,
  isSearchLoading = false,
  listRef,
  searchValue,
  onSearchChange,
  onSelectionChange,
  onLocalEdit,
  onDelete,
  onReorder,
}: QuestionListProps<Question>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>(questions);

  // Sync from the incoming questions prop while preserving any drag-drop order the user set.
  // The parent re-creates the array on every render (checkbox ticks, text edits, etc.),
  // so we compare by ID rather than by reference to avoid spurious resets.
  useEffect(() => {
    setOrderedQuestions((current) => {
      const incomingById = new Map(questions.map((q) => [q.id, q]));
      const currentIds = new Set(current.map((q) => q.id));

      // Same set of IDs — only question content may have changed (text edit, local draft).
      // Update in-place to keep the user's drag order intact.
      if (currentIds.size === questions.length && questions.every((q) => currentIds.has(q.id))) {
        return current.map((q) => incomingById.get(q.id) ?? q);
      }

      // Questions were added or removed: preserve relative order of surviving items,
      // then append any newly added ones at the end (in their API arrival order).
      const kept = current
        .filter((q) => incomingById.has(q.id))
        .map((q) => incomingById.get(q.id)!);
      const added = questions.filter((q) => !currentIds.has(q.id));
      return [...kept, ...added];
    });
  }, [questions]);

  const query = searchValue.trim().toLocaleLowerCase();
  // Drag-and-drop only makes sense on the unfiltered list; disable handles during search.
  const isDragEnabled = !query;

  const selectedCount = orderedQuestions.filter((q) => selectedIds.includes(q.id)).length;
  const filteredQuestions = orderedQuestions.filter((q) =>
    q.question_text.toLocaleLowerCase().includes(query)
  );
  const allSelected =
    filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedIds.includes(q.id));
  const someSelected = filteredQuestions.some((q) => selectedIds.includes(q.id));

  const selectDisplayed = (checked: boolean) => {
    const displayedIds = new Set(filteredQuestions.map((q) => q.id));
    onSelectionChange(
      checked
        ? [...new Set([...selectedIds, ...displayedIds])]
        : selectedIds.filter((id) => !displayedIds.has(id))
    );
  };

  const handleBlurSave = (question: Question, newText: string) => {
    onLocalEdit(question, newText);
    setEditingId(null);
  };

  const handleDrop = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setOrderedQuestions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onReorder?.(next);
      return next;
    });
  };

  const dragHandle = (
    <div className="cursor-move flex items-center justify-center bg-[#E5E5E5] rounded-full p-2 shadow-sm h-8 w-8 shrink-0">
      <div className="relative" style={{ width: '12px', height: '20px' }}>
        <HiDotsVertical className="absolute left-0" style={{ fontSize: '20px' }} />
        <HiDotsVertical className="absolute right-0" style={{ fontSize: '20px' }} />
      </div>
    </div>
  );

  return (
    <div className="min-w-0">
      {(orderedQuestions.length > 0 || searchValue) && (
        <div className="mb-2 space-y-3 border-b border-gray-100 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                disabled={isLoading || filteredQuestions.length === 0}
                onChange={(e) => selectDisplayed(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
              />
              {query ? 'Select shown' : 'Select All'}
            </label>
            <div className="relative w-full max-w-64">
              <MdSearch
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                aria-label="Search questions"
                placeholder="Search questions"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 w-full rounded-full border border-gray-200 bg-white pl-9 pr-10 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary-100 [&::-webkit-search-cancel-button]:appearance-none"
              />
              {searchValue && (
                <Tooltip title="Clear search">
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-gray-500 hover:bg-gray-100 focus-visible:outline-primary"
                  >
                    <MdClose size={16} />
                  </button>
                </Tooltip>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
              {query && (
                <span role="status" className="text-xs text-gray-500">
                  Showing {filteredQuestions.length} of {questions.length}
                </span>
              )}
              <span role="status" className="text-sm font-medium text-gray-700">
                Selected Questions: <strong className="text-primary-700">{selectedCount}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
      {isLoading ? (
        <p role="status" className="py-6 text-center text-sm italic text-gray-400">
          Loading...
        </p>
      ) : isSearchLoading ? (
        <div className="max-h-[46vh] min-h-[120px] space-y-3 overflow-hidden pr-1">
          {SHIMMER_WIDTHS.map((_, i) => (
            <QuestionRowShimmer key={i} index={i} />
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
          {query ? (
            <>
              <p role="status" className="m-0 text-sm font-semibold text-gray-700">
                No questions match &ldquo;{searchValue.trim()}&rdquo;
              </p>
              <p className="mt-1 m-0 text-xs text-gray-500">
                Try a different keyword or clear the search to see all questions.
              </p>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <MdClose size={14} />
                Clear search
              </button>
            </>
          ) : (
            <p role="status" className="m-0 text-sm font-semibold text-gray-700">
              No questions for this round yet
            </p>
          )}
        </div>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <div ref={listRef} className="max-h-[46vh] min-h-[120px] space-y-3 overflow-y-auto pr-1">
            {filteredQuestions.map((question) => {
              const orderedIndex = orderedQuestions.indexOf(question);
              return (
                <div key={question.id} className="flex items-center gap-2">
                  {isDragEnabled ? (
                    <DraggableItem
                      item={question}
                      index={orderedIndex}
                      moveItem={handleDrop}
                      renderDragHandle={false}
                    >
                      {() => dragHandle}
                    </DraggableItem>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {isDragEnabled ? (
                      <DraggableItem
                        item={question}
                        index={orderedIndex}
                        moveItem={handleDrop}
                        renderDragHandle={false}
                      >
                        {({ isOver }) => (
                          <QuestionRowItem
                            number={orderedIndex + 1}
                            question={{ id: question.id, question: question.question_text }}
                            checked={selectedIds.includes(question.id)}
                            onCheckChange={(checked) =>
                              onSelectionChange(
                                checked
                                  ? [...new Set([...selectedIds, question.id])]
                                  : selectedIds.filter((id) => id !== question.id)
                              )
                            }
                            isEditing={editingId === question.id}
                            onStartEdit={() => setEditingId(question.id)}
                            onBlurSave={(newText) => handleBlurSave(question, newText)}
                            onCancelEdit={() => setEditingId(null)}
                            onDelete={() => onDelete(question.id)}
                            isOver={isOver}
                          />
                        )}
                      </DraggableItem>
                    ) : (
                      <QuestionRowItem
                        number={orderedIndex + 1}
                        question={{ id: question.id, question: question.question_text }}
                        checked={selectedIds.includes(question.id)}
                        onCheckChange={(checked) =>
                          onSelectionChange(
                            checked
                              ? [...new Set([...selectedIds, question.id])]
                              : selectedIds.filter((id) => id !== question.id)
                          )
                        }
                        isEditing={editingId === question.id}
                        onStartEdit={() => setEditingId(question.id)}
                        onBlurSave={(newText) => handleBlurSave(question, newText)}
                        onCancelEdit={() => setEditingId(null)}
                        onDelete={() => onDelete(question.id)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DndProvider>
      )}
    </div>
  );
}
