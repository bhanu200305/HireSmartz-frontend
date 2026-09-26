import React from 'react';
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
    <div className="flex items-center gap-3 relative">
      <div className="flex items-center gap-2 z-10">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckChange(e.target.checked)}
          className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 cursor-pointer mt-1"
        />
      </div>

      <div className="flex-1">
        <div className="bg-white border border-[var(--border)] px-6 py-4 rounded-full transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between w-full">
            <Typography variant="body2" className="text-gray-800 m-0 leading-normal">
              {question.question}
            </Typography>
            <div className="flex items-center gap-3">
              <button className="text-primary hover:text-brand-600 cursor-pointer" onClick={onEdit}>
                <MdEdit size={18} />
              </button>
              <button className="text-red-500 hover:text-red-700 cursor-pointer" onClick={onDelete}>
                <HiOutlineTrash size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default QuestionRowItem;
