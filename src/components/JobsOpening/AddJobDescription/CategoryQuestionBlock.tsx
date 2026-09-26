import React from 'react';
import { Typography } from '../../shared';
import QuestionRowItem from './QuestionRowItem';
import InlineQuestionInput from './InlineQuestionInput';

interface CategoryQuestionBlockProps {
  categoryId: number;
  title: string;
  questions: any[];
  selectedIds: number[];
  onSelectCategory: (checked: boolean) => void;
  onSelectOne: (id: number, checked: boolean) => void;
  onDrop: (fromIndex: number, toIndex: number) => void;
  onDeleteCategory: () => void;
  onEdit: (question: any) => void;
  onDelete: (id: number) => void;
  inlineText: string;
  onInlineChange: (val: string) => void;
  onInlineSubmit: () => void;
  isInlineSubmitting?: boolean;
  isLoading?: boolean;
}

export const CategoryQuestionBlock = ({
  title,
  questions,
  selectedIds,
  onSelectCategory,
  onSelectOne,
  onDrop,
  onDeleteCategory,
  onEdit,
  onDelete,
  inlineText,
  onInlineChange,
  onInlineSubmit,
  isInlineSubmitting = false,
  isLoading = false,
}: CategoryQuestionBlockProps) => {
  const isCatAllSelected =
    questions.length > 0 && questions.every((q) => selectedIds.includes(q.id));
  const catCheckedIds = questions.map((q) => q.id).filter((id) => selectedIds.includes(id));

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
      {/* Category block header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isCatAllSelected}
            onChange={(e) => onSelectCategory(e.target.checked)}
            className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 cursor-pointer"
          />
          <Typography variant="subtitle1" className="font-bold text-gray-800 m-0">
            {title} ({questions.length})
          </Typography>
        </div>
        {(catCheckedIds.length > 0 || questions.length > 0) && (
          <button
            className="text-red-500 hover:text-red-700 text-sm font-semibold hover:underline cursor-pointer"
            onClick={onDeleteCategory}
          >
            {catCheckedIds.length > 0 ? `Delete selected (${catCheckedIds.length})` : 'Delete all'}
          </button>
        )}
      </div>

      {/* List items */}
      {isLoading ? (
        <p className="text-gray-400 py-4 text-center italic text-sm">Loading questions...</p>
      ) : questions.length === 0 ? (
        <p className="text-gray-400 py-4 text-center italic text-sm">
          AI service is generating questions, this may take some time
        </p>
      ) : (
        <div className="space-y-3 mb-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fromIndex = Number(e.dataTransfer.getData('text/plain'));
                if (!Number.isNaN(fromIndex)) onDrop(fromIndex, index);
              }}
            >
              <QuestionRowItem
                question={question}
                checked={selectedIds.includes(question.id)}
                onCheckChange={(checked) => onSelectOne(question.id, checked)}
                onEdit={() => onEdit(question)}
                onDelete={() => onDelete(question.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Category input */}
      <div className="mt-4">
        <InlineQuestionInput
          value={inlineText}
          onChange={onInlineChange}
          onSubmit={onInlineSubmit}
          placeholder={`Add single or multiple ${title.toLowerCase()} here.`}
          footnote=""
          isSubmitting={isInlineSubmitting}
        />
      </div>
    </div>
  );
};
export default CategoryQuestionBlock;
