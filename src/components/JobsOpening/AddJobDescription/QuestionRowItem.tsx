import React, { useEffect, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import { Typography } from '../../shared';
import { HiOutlineTrash } from 'react-icons/hi';
import { MdCheck, MdClose, MdEdit } from 'react-icons/md';

interface QuestionRowItemProps {
  question: {
    id: string | number;
    question: string;
  };
  /** 1-based position in the list, derived from the render order so it never goes stale. */
  number?: number;
  checked: boolean;
  onCheckChange: (checked: boolean) => void;
  onDelete: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  /** Called with the trimmed new text when blur/Enter saves locally. */
  onBlurSave: (newText: string) => void;
  onCancelEdit: () => void;
  /** Highlights the card when a dragged question is hovering over it. */
  isOver?: boolean;
}

export const QuestionRowItem = ({
  question,
  number,
  checked,
  onCheckChange,
  onDelete,
  isEditing,
  onStartEdit,
  onBlurSave,
  onCancelEdit,
  isOver = false,
}: QuestionRowItemProps) => {
  const [editValue, setEditValue] = useState(question.question);
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracks whether Escape was pressed so the subsequent blur doesn't save.
  const escapedRef = useRef(false);

  useEffect(() => {
    if (isEditing) {
      setEditValue(question.question);
      escapedRef.current = false;
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing, question.question]);

  const commitOrRevert = (relatedTarget: EventTarget | null) => {
    if (escapedRef.current) {
      escapedRef.current = false;
      return;
    }
    // If focus moved to the delete button, cancel the edit instead of saving.
    const el = relatedTarget as HTMLElement | null;
    if (el?.getAttribute('aria-label') === 'Delete question') {
      onCancelEdit();
      return;
    }
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== question.question) {
      onBlurSave(trimmed);
    } else {
      onCancelEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Blur triggers commitOrRevert.
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      escapedRef.current = true;
      onCancelEdit();
    }
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-2 transition-colors ${
        isOver
          ? 'border-primary bg-primary-50/60'
          : checked
            ? 'border-primary-200 bg-primary-50'
            : 'border-[var(--border)] bg-white'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckChange(e.target.checked)}
        aria-label="Select question"
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
      />
      {number !== undefined && (
        <span className="min-w-6 shrink-0 text-sm font-semibold text-gray-500">{number}.</span>
      )}

      {isEditing ? (
        <>
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={(e) => commitOrRevert(e.relatedTarget)}
            className="min-w-0 flex-1 rounded-lg border border-primary-200 bg-[#fff7f0] px-3 py-1 text-sm text-gray-800 focus:border-primary focus:outline-none"
          />
          <div className="flex shrink-0 items-center gap-3">
            <Tooltip title="Save (Enter)">
              <button
                type="button"
                aria-label="Save edit"
                className="cursor-pointer text-primary hover:text-brand-600"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const trimmed = editValue.trim();
                  if (trimmed && trimmed !== question.question) {
                    onBlurSave(trimmed);
                  } else {
                    onCancelEdit();
                  }
                }}
              >
                <MdCheck size={18} />
              </button>
            </Tooltip>
            <Tooltip title="Discard (Esc)">
              <button
                type="button"
                aria-label="Discard edit"
                className="cursor-pointer text-gray-400 hover:text-red-500"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onCancelEdit}
              >
                <MdClose size={18} />
              </button>
            </Tooltip>
            <Tooltip title="Delete Question">
              <button
                type="button"
                className="cursor-pointer text-red-500 hover:text-red-700"
                onClick={onDelete}
                aria-label="Delete question"
              >
                <HiOutlineTrash size={18} />
              </button>
            </Tooltip>
          </div>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <Typography
              variant="body2"
              className="m-0 break-words leading-normal text-gray-800 cursor-pointer hover:text-primary"
              onClick={onStartEdit}
            >
              {question.question}
            </Typography>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Tooltip title="Edit Question">
              <button
                type="button"
                className="cursor-pointer text-primary hover:text-brand-600"
                onClick={onStartEdit}
                aria-label="Edit question"
              >
                <MdEdit size={18} />
              </button>
            </Tooltip>
            <Tooltip title="Delete Question">
              <button
                type="button"
                className="cursor-pointer text-red-500 hover:text-red-700"
                onClick={onDelete}
                aria-label="Delete question"
              >
                <HiOutlineTrash size={18} />
              </button>
            </Tooltip>
          </div>
        </>
      )}
    </div>
  );
};
export default QuestionRowItem;
