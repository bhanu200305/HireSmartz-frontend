import React from 'react';
import { Tooltip } from 'antd';
import { MdInfoOutline } from 'react-icons/md';
import { Button, Typography } from '../../shared';

interface InlineQuestionInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  footnote?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export const InlineQuestionInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type a question, or paste several - one per line.',
  footnote = '',
  isSubmitting = false,
  disabled = false,
}: InlineQuestionInputProps) => {
  const canSubmit = !!value.trim() && !isSubmitting && !disabled;
  return (
    <div className="w-full rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-sm font-semibold text-gray-800">Write Questions</span>
        <Tooltip title="Type one question, or paste several at once - each line becomes its own question.">
          <MdInfoOutline className="text-gray-400" size={15} />
        </Tooltip>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        disabled={disabled}
        className="w-full resize-none rounded-xl border border-gray-200 bg-[#F6F8FD] px-4 py-2.5 text-sm leading-relaxed text-gray-800 placeholder-gray-400 focus:border-primary focus:outline-none disabled:cursor-not-allowed roboto-font"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }
        }}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-400">Enter adds · Shift+Enter new line</span>
        <Tooltip title="Add the question(s) above to this round.">
          <Button
            type="button"
            className="rounded-full bg-button px-6 py-1.5 text-sm font-semibold text-white"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            Add
          </Button>
        </Tooltip>
      </div>
      {footnote && (
        <Typography variant="caption" color="text-muted" className="mt-2 block font-medium">
          {footnote}
        </Typography>
      )}
    </div>
  );
};
export default InlineQuestionInput;
