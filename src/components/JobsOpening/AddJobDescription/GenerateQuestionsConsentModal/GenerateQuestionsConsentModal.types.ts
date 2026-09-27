export interface ScoringSectionOption {
  code: string;
  label: string;
}

export interface GenerateQuestionsConsentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (
    mode: 'ADD' | 'REPLACE',
    questionCount: number,
    categoryCodes: string[] | null
  ) => void;
  isLoading?: boolean;
  /** False skips the Append/Replace choice (default true). */
  hasExistingQuestions?: boolean;
  /** False hides the question-count input (default true) - not every backend accepts a count. */
  showQuestionCount?: boolean;
  /** Scoring-section picker, rendered only when non-empty (Hiring Panel only). */
  scoringSectionOptions?: ScoringSectionOption[];
}
