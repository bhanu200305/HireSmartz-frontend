import React, { FC, useState } from 'react';
import { MdClose, MdPostAdd, MdOutlineRotateLeft } from 'react-icons/md';
import { Button, Typography } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { GenerateQuestionsConsentModalProps } from './GenerateQuestionsConsentModal.types';
import clsx from 'clsx';

const DEFAULT_QUESTION_COUNT = 10;
const MIN_QUESTION_COUNT = 1;
const MAX_QUESTION_COUNT = 100;

const GenerateQuestionsConsentModal: FC<GenerateQuestionsConsentModalProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  hasExistingQuestions = true,
}) => {
  const [selectedMode, setSelectedMode] = useState<'ADD' | 'REPLACE' | null>(null);
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);

  if (!open) return null;

  // Nothing to append to or replace when the list is already empty.
  const effectiveMode = hasExistingQuestions ? selectedMode : 'REPLACE';

  const handleConfirmClick = () => {
    if (effectiveMode) {
      onConfirm(effectiveMode, questionCount);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[2000] p-4 animate-fade-in">
      <div className="bg-[#FAFAFA] p-6 rounded-3xl shadow-2xl max-w-lg w-full relative border border-gray-200">
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

        {/* Question count */}
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
            value={questionCount}
            disabled={isLoading}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isNaN(next)) return;
              setQuestionCount(
                Math.min(MAX_QUESTION_COUNT, Math.max(MIN_QUESTION_COUNT, next))
              );
            }}
            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
          />
        </div>

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
              'text-white py-2 px-6 rounded-3xl cursor-pointer text-sm font-semibold transition flex items-center justify-center gap-2 min-w-[120px]',
              effectiveMode === 'REPLACE'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-button hover:opacity-90',
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
