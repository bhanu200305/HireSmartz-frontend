import React, { FC, useEffect, useRef, useState } from 'react';
import { MdClose, MdPostAdd, MdOutlineRotateLeft } from 'react-icons/md';
import { Button, Typography } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { GenerateQuestionsConsentModalProps } from './GenerateQuestionsConsentModal.types';
import clsx from 'clsx';

const DEFAULT_QUESTION_COUNT = 10;
const MIN_QUESTION_COUNT = 1;
const MAX_QUESTION_COUNT = 18;

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

  // Every section starts selected, reset on each open (and when the round's
  // sections load) so a previous open/round's choice is never submitted.
  const sectionCodesKey = scoringSectionOptions.map((option) => option.code).join(',');
  useEffect(() => {
    if (open) setSelectedCategoryCodes(sectionCodesKey ? sectionCodesKey.split(',') : []);
  }, [open, sectionCodesKey]);

  const confirmRef = useRef<() => void>(() => {});

  // No card is pre-selected: clear any previous choice every time the modal opens.
  useEffect(() => {
    if (open) setSelectedMode(null);
  }, [open]);

  // Enter confirms (same as clicking Confirm) once a card is selected.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.isComposing) return;
      // Let Enter work normally on focused buttons (Close, Cancel, section chips).
      if ((event.target as HTMLElement | null)?.closest('button')) return;
      event.preventDefault();
      confirmRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

  // All selected (the default) or none selected both mean "every section",
  // sent as `null` exactly as before; only a narrowed choice sends codes.
  const isNarrowedSectionChoice =
    selectedCategoryCodes.length > 0 && selectedCategoryCodes.length < scoringSectionOptions.length;

  const handleConfirmClick = () => {
    if (isLoading || !effectiveMode) return;
    onConfirm(
      effectiveMode,
      clampedQuestionCount(),
      showSectionPicker && isNarrowedSectionChoice ? selectedCategoryCodes : null
    );
  };

  confirmRef.current = handleConfirmClick;

  return (
    <div
      className="app-modal-overlay fixed inset-0 flex items-center justify-center bg-black/60 z-[2000] p-4 animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) onClose();
      }}
    >
      {/* Rounding + clipping live here, scrolling lives on the inner div below -
          a scrollbar never respects its own element's border-radius, so
          combining both on one box makes the scrollbar poke past the corner. */}
      <div className="bg-[#FAFAFA] rounded-3xl shadow-2xl max-w-2xl w-full relative border border-gray-200 overflow-hidden">
        <div className="app-modal-panel p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h5" className="text-gray-800 m-0 font-semibold font-sora">
              Generate Questions with AI
            </Typography>
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 cursor-pointer transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close"
            >
              <MdClose size={22} />
            </button>
          </div>

          {/* Description */}
          {/* <div className="mb-6">
            <Typography variant="body2" className="text-gray-500 font-roboto m-0">
              Choose how many questions to generate and how to apply them to the current list.
            </Typography>
          </div> */}

          {/* Question count - hidden where the backend has no count parameter */}
          {showQuestionCount && (
            <div className="mb-6 flex items-center gap-3">
              <Typography
                variant="subtitle2"
                className="text-gray-800 font-semibold font-sora block mb-2"
              >
                Number of Questions (up to {MAX_QUESTION_COUNT} at a time)
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
                className="w-14 shrink-0 border border-gray-300 rounded-lg px-2 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
              />
            </div>
          )}

          {/* Options Cards */}
          {hasExistingQuestions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {/* Append Option */}
              <div
                onClick={() => !isLoading && setSelectedMode('ADD')}
                className={clsx(
                  'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200',
                  selectedMode === 'ADD'
                    ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div
                  className={clsx(
                    'p-2.5 rounded-lg shrink-0',
                    selectedMode === 'ADD'
                      ? 'bg-emerald-200 text-emerald-800'
                      : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  <MdPostAdd size={22} />
                </div>
                <div className="flex-1 text-left">
                  <Typography
                    variant="subtitle2"
                    className="text-gray-800 font-semibold font-sora block m-0"
                  >
                    Append to Existing
                  </Typography>
                  <Typography
                    variant="caption"
                    className="text-gray-500 font-roboto leading-normal sr-only"
                  >
                    Keep all current questions and append the newly generated questions to the end
                    of your list.
                  </Typography>
                </div>
              </div>

              {/* Replace Option */}
              <div
                onClick={() => !isLoading && setSelectedMode('REPLACE')}
                className={clsx(
                  'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200',
                  selectedMode === 'REPLACE'
                    ? 'border-rose-400 bg-rose-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div
                  className={clsx(
                    'p-2.5 rounded-lg shrink-0',
                    selectedMode === 'REPLACE'
                      ? 'bg-rose-200 text-rose-800'
                      : 'bg-rose-100 text-rose-700'
                  )}
                >
                  <MdOutlineRotateLeft size={22} />
                </div>
                <div className="flex-1 text-left">
                  <Typography
                    variant="subtitle2"
                    className="text-gray-800 font-semibold font-sora block m-0"
                  >
                    Replace Current Questions
                  </Typography>
                  <Typography
                    variant="caption"
                    className="text-gray-500 font-roboto leading-normal sr-only"
                  >
                    Delete all existing questions for this list and replace them completely with the
                    newly generated ones.
                  </Typography>
                </div>
              </div>
            </div>
          )}

          {/* Scoring-section picker - Live Video / In-Person rounds only */}
          {showSectionPicker && (
            <div className="mb-6">
              <Typography
                variant="subtitle2"
                className="text-gray-800 font-semibold font-sora block mb-1"
              >
                Scoring Sections
              </Typography>
              <Typography variant="caption" className="text-gray-500 font-roboto block mb-2">
                Every section is selected. Untick any you don&apos;t want questions from.
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
              className="min-h-11 border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 py-2 px-6 rounded-3xl cursor-pointer text-sm font-semibold transition"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleConfirmClick}
              disabled={isLoading || !effectiveMode}
              className={clsx(
                'min-h-11 text-white py-2 px-6 rounded-3xl cursor-pointer text-sm font-semibold transition flex items-center justify-center gap-2 min-w-[120px] bg-primary hover:bg-brand-700',
                (isLoading || !effectiveMode) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLoading && <Loader />}
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateQuestionsConsentModal;
