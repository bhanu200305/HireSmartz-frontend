import React, { FC, useEffect, useState } from 'react';
import { MdClose, MdPostAdd, MdOutlineRotateLeft } from 'react-icons/md';
import { Button, Typography } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { GenerateQuestionsConsentModalProps } from './GenerateQuestionsConsentModal.types';
import clsx from 'clsx';

const DEFAULT_QUESTION_COUNT = 10;
const MIN_QUESTION_COUNT = 1;
const MAX_QUESTION_COUNT = 30;

const GenerateQuestionsConsentModal: FC<GenerateQuestionsConsentModalProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  hasExistingQuestions = true,
  showQuestionCount = true,
  scoringSectionOptions = [],
}) => {
  const [selectedMode, setSelectedMode] = useState<'ADD' | 'REPLACE' | null>(null);
  // Raw typed text, kept separate from the clamped value so the field can go empty mid-edit.
  const [questionCountText, setQuestionCountText] = useState(String(DEFAULT_QUESTION_COUNT));
  const [selectedCategoryCodes, setSelectedCategoryCodes] = useState<string[]>([]);

  // Avoid submitting a stale selection from a previous open/round.
  useEffect(() => {
    if (open) setSelectedCategoryCodes([]);
  }, [open]);

  if (!open) return null;

  // Nothing to append to or replace when the list is already empty.
  const effectiveMode = hasExistingQuestions ? selectedMode : 'REPLACE';
  const showSectionPicker = scoringSectionOptions.length > 0;

  const clampedQuestionCount = () => {
    const parsed = Number(questionCountText);
    if (!questionCountText || Number.isNaN(parsed)) return MIN_QUESTION_COUNT;
    return Math.min(MAX_QUESTION_COUNT, Math.max(MIN_QUESTION_COUNT, Math.trunc(parsed)));
  };

  const toggleCategoryCode = (code: string) => {
    setSelectedCategoryCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleConfirmClick = () => {
    if (effectiveMode) {
      onConfirm(
        effectiveMode,
        clampedQuestionCount(),
        showSectionPicker && selectedCategoryCodes.length > 0 ? selectedCategoryCodes : null
      );
    }
  };

  return (
    <div className="app-modal-overlay fixed inset-0 flex items-center justify-center bg-black/60 z-[2000] p-4 animate-fade-in">
      <div className="app-modal-panel bg-[#FAFAFA] p-6 rounded-3xl shadow-2xl max-w-lg w-full relative border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Typography variant="h5" className="text-gray-800 m-0 font-semibold font-sora">
            Generate Questions with AI
          </Typography>
          <button
            className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0 transition"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Description */}
        <div className="mb-6">
          <Typography variant="body2" className="text-gray-500 font-roboto m-0">
            Choose how many questions to generate and how to apply them to the current list.
          </Typography>
        </div>

        {/* Question count - hidden where the backend has no count parameter */}
        {showQuestionCount && (
          <div className="mb-6">
            <Typography
              variant="subtitle2"
              className="text-gray-800 font-semibold font-sora block mb-2"
            >
              Number of questions
            </Typography>
            <input
              type="number"
              min={MIN_QUESTION_COUNT}
              max={MAX_QUESTION_COUNT}
              value={questionCountText}
              disabled={isLoading}
              onChange={(e) => {
                // Field can go empty mid-typing, but any complete digit
                // string outside [MIN,MAX] is rejected outright - never
                // reaches state, so there's nothing to silently clamp later.
                const raw = e.target.value;
                if (raw === '') {
                  setQuestionCountText(raw);
                  return;
                }
                if (!/^\d+$/.test(raw)) return;
                const value = Number(raw);
                if (value > MAX_QUESTION_COUNT || value < MIN_QUESTION_COUNT) return;
                setQuestionCountText(raw);
              }}
              onBlur={() => setQuestionCountText(String(clampedQuestionCount()))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
            />
          </div>
        )}

        {/* Options Cards */}
        {hasExistingQuestions && (
          <div className="flex flex-col gap-4 mb-6">
            {/* Append Option */}
            <div
              onClick={() => !isLoading && setSelectedMode('ADD')}
              className={clsx(
                'flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200',
                selectedMode === 'ADD'
                  ? 'border-brand-500 bg-brand-50/40 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div
                className={clsx(
                  'p-2.5 rounded-xl shrink-0',
                  selectedMode === 'ADD' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'
                )}
              >
                <MdPostAdd size={22} />
              </div>
              <div>
                <Typography
                  variant="subtitle2"
                  className="text-gray-800 font-semibold font-sora block mb-1"
                >
                  Append to Existing
                </Typography>
                <Typography variant="caption" className="text-gray-500 font-roboto leading-normal">
                  Keep all current questions and append the newly generated questions to the end of
                  your list.
                </Typography>
              </div>
            </div>

            {/* Replace Option */}
            <div
              onClick={() => !isLoading && setSelectedMode('REPLACE')}
              className={clsx(
                'flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200',
                selectedMode === 'REPLACE'
                  ? 'border-red-500 bg-red-50/20 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div
                className={clsx(
                  'p-2.5 rounded-xl shrink-0',
                  selectedMode === 'REPLACE' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                )}
              >
                <MdOutlineRotateLeft size={22} />
              </div>
              <div>
                <Typography
                  variant="subtitle2"
                  className="text-gray-850 font-semibold font-sora block mb-1"
                >
                  Replace Current Questions
                </Typography>
                <Typography variant="caption" className="text-gray-500 font-roboto leading-normal">
                  Delete all existing questions for this list and replace them completely with the
                  newly generated ones.
                </Typography>
              </div>
            </div>
          </div>
        )}

        {/* Scoring-section picker - Hiring Panel rounds only */}
        {showSectionPicker && (
          <div className="mb-6">
            <Typography
              variant="subtitle2"
              className="text-gray-800 font-semibold font-sora block mb-1"
            >
              Scoring sections
            </Typography>
            <Typography variant="caption" className="text-gray-500 font-roboto block mb-2">
              Pick which sections to generate questions from. Leave nothing selected to use every
              section.
            </Typography>
            <div className="flex flex-wrap gap-2">
              {scoringSectionOptions.map((option) => {
                const isSelected = selectedCategoryCodes.includes(option.code);
                return (
                  <button
                    key={option.code}
                    type="button"
                    disabled={isLoading}
                    onClick={() => toggleCategoryCode(option.code)}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer',
                      isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 py-2 px-6 rounded-3xl cursor-pointer text-sm font-semibold transition"
          >
            CANCEL
          </Button>

          <Button
            type="button"
            onClick={handleConfirmClick}
            disabled={isLoading || !effectiveMode}
            className={clsx(
              'text-white py-2 px-6 rounded-3xl cursor-pointer text-sm font-semibold transition flex items-center justify-center gap-2 min-w-[120px] bg-success hover:opacity-90',
              (isLoading || !effectiveMode) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading && <Loader />}
            CONFIRM
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GenerateQuestionsConsentModal;
