import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../../src/api/candidate-service/Candidates/interviewRounds', () => ({
  useAdvanceCandidateMutation: () => [vi.fn()],
  useLazyListCandidateInterviewRoundsQuery: () => [vi.fn()],
}));
vi.mock('../../../../src/api/candidate-service/Candidates/scoring', () => ({
  useRecordRecruiterRoundScoreMutation: () => [vi.fn()],
  useRecordRecruiterRoundFeedbackMutation: () => [vi.fn()],
  useRecordResumeReviewMutation: () => [vi.fn()],
}));

import AdvanceCandidateModal, {
  type AdvanceFeedbackRequirement,
} from '../../../../src/components/JobsOpening/Candidates/Modal/AdvanceCandidateModal';

const candidate = { id: 'c1', first_name: 'Gregor', last_name: 'Neel' } as never;
const round = (name: string) => ({ id: name, stage_type: 'interview', round_name: name }) as never;

const renderModal = (feedbackRequirement: AdvanceFeedbackRequirement) =>
  render(
    <AdvanceCandidateModal
      open
      onClose={vi.fn()}
      candidate={candidate}
      fromRound={round('Intake Call')}
      toRound={round('AI Audio Screening')}
      feedbackRequirement={feedbackRequirement}
      canAutoInvite
      onSuccess={vi.fn()}
    />
  );

describe('AdvanceCandidateModal feedback gate', () => {
  it('asks for feedback when advancing from the Intake Call round', () => {
    renderModal({
      kind: 'round',
      scoreId: null,
      rating: 0,
      comment: '',
      withRecommendation: false,
    });
    expect(screen.getByPlaceholderText('Add feedback here...')).toBeTruthy();
    // No score record yet, so it is rated and saved on the round itself.
    expect(screen.getAllByText(/Rating/).length).toBeGreaterThan(0);
    expect(screen.getByText('CONFIRM').closest('button')?.disabled).toBe(true);
  });

  it('asks for stars and feedback, no dropdown, for an interview round', () => {
    renderModal({ kind: 'round', scoreId: 's1', rating: 0, comment: '', withRecommendation: true });
    expect(screen.getByPlaceholderText('Add feedback here...')).toBeTruthy();
    expect(screen.getAllByText(/Rating/).length).toBeGreaterThan(0);
    // Stars only: the interviewer verdict is derived from them.
    expect(screen.queryByText(/Recommendation/)).toBeNull();
  });

  it('asks for a rating and feedback on the resume stage', () => {
    renderModal({ kind: 'resume', rating: 0, comment: '' });
    expect(screen.getByPlaceholderText('Add feedback here...')).toBeTruthy();
    expect(screen.getAllByText(/Rating/).length).toBeGreaterThan(0);
  });

  it('skips the feedback step only when it is already on file', () => {
    renderModal(null);
    expect(screen.queryByPlaceholderText('Add feedback here...')).toBeNull();
  });
});
