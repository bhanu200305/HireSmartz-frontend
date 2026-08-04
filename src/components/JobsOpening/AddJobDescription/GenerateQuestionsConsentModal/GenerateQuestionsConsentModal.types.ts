export interface GenerateQuestionsConsentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: 'ADD' | 'REPLACE') => void;
  isLoading?: boolean;
}
