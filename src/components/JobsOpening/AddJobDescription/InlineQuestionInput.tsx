import React from 'react';
import { Typography } from '../../shared';

interface InlineQuestionInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  footnote?: string;
  isSubmitting?: boolean;
}

export const InlineQuestionInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Add single or multiple questions here.',
  footnote = '*Paste a single question or multiple questions here. You can enter them one by one or bulk copy-paste them for processing.',
  isSubmitting = false,
}: InlineQuestionInputProps) => {
  return (
    <div className="w-full">
      <div className="border border-[var(--border)] rounded-2xl bg-[#F6F8FD] p-4 w-full flex items-center justify-between gap-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full bg-transparent border-none resize-none focus:outline-none placeholder-gray-400 text-sm leading-relaxed text-gray-800 roboto-font"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <button
          className={`p-3 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm text-primary hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all ${
            !value.trim() || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          onClick={onSubmit}
          disabled={!value.trim() || isSubmitting}
        >
          <span className="text-xl font-bold leading-none">+</span>
        </button>
      </div>
      {footnote && (
        <Typography variant="caption" color="text-muted" className="mt-2 block pl-2 font-medium">
          {footnote}
        </Typography>
      )}
    </div>
  );
};
export default InlineQuestionInput;
