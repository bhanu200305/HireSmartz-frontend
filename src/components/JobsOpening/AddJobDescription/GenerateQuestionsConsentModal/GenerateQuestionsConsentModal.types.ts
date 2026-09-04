export interface GenerateQuestionsConsentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: 'ADD' | 'REPLACE', questionCount: number) => void;
  isLoading?: boolean;
  /** False skips the Append/Replace choice (default true). */
  hasExistingQuestions?: boolean;
}
