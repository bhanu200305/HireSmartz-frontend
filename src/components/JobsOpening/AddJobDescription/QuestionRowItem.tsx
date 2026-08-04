import React from 'react';
import { DraggableItem } from '../../shared/ui/DragAndDrop';
import { Typography } from '../../shared';
import { HiDotsVertical, HiOutlineTrash } from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';

interface QuestionRowItemProps {
  question: { id: number; question: string };
  index: number;
  onDrop: (fromIndex: number, toIndex: number) => void;
  checked: boolean;
  onCheckChange: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const QuestionRowItem = ({
  question,
  index,
  onDrop,
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
        <DraggableItem item={question} index={index} moveItem={onDrop} renderDragHandle={false}>
          {() => (
            <div className="cursor-move flex items-center justify-center bg-[#E5E5E5] rounded-full p-2 shadow-sm h-8 w-8 mt-1">
              <div className="relative" style={{ width: '12px', height: '20px' }}>
                <HiDotsVertical className="absolute left-0" style={{ fontSize: '20px' }} />
                <HiDotsVertical className="absolute right-0" style={{ fontSize: '20px' }} />
              </div>
            </div>
          )}
        </DraggableItem>
      </div>

      <div className="flex-1">
        <DraggableItem item={question} index={index} moveItem={onDrop} renderDragHandle={false}>
          {({ isOver }) => (
            <div
              className={`bg-white border ${
                isOver ? 'border-primary scale-[1.01] shadow-sm' : 'border-[var(--border)]'
              } px-6 py-4 rounded-full transition-all duration-300 ease-in-out`}
            >
              <div className="flex items-center justify-between w-full">
                <Typography variant="body2" className="text-gray-800 m-0 leading-normal">
                  {question.question}
                </Typography>
                <div className="flex items-center gap-3">
                  <button
                    className="text-primary hover:text-blue-600 cursor-pointer"
                    onClick={onEdit}
                  >
                    <MdEdit size={18} />
                  </button>
                  <button
                    className="text-red-500 hover:text-red-700 cursor-pointer"
                    onClick={onDelete}
                  >
                    <HiOutlineTrash size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </DraggableItem>
      </div>
    </div>
  );
};
export default QuestionRowItem;
