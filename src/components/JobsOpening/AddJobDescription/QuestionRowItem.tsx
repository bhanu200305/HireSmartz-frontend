import React from 'react';
import { Tooltip } from 'antd';
import { Typography } from '../../shared';
import { HiOutlineTrash } from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';

interface QuestionRowItemProps {
  question: { id: string | number; question: string };
  checked: boolean;
  onCheckChange: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const QuestionRowItem = ({
  question,
  checked,
  onCheckChange,
  onEdit,
  onDelete,
}: QuestionRowItemProps) => {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        checked ? 'border-primary-200 bg-primary-50' : 'border-[var(--border)] bg-white'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckChange(e.target.checked)}
        aria-label="Select question"
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
      />
      <Typography variant="body2" className="m-0 min-w-0 flex-1 leading-normal text-gray-800">
        {question.question}
      </Typography>
      <div className="flex shrink-0 items-center gap-3">
        <Tooltip title="Edit question">
          <button
            type="button"
            className="cursor-pointer text-primary hover:text-brand-600"
            onClick={onEdit}
            aria-label="Edit question"
          >
            <MdEdit size={18} />
          </button>
        </Tooltip>
        <Tooltip title="Delete question">
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
    </div>
  );
};
export default QuestionRowItem;
