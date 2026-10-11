import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobScoringCriteriaTab from '../../../src/components/JobsOpening/JobScoringCriteriaTab';
import type {
  JobScoringConfigResponse,
  UpdateJobScoringConfigRequest,
} from '../../../src/api/job-service/JobOpening/jobScoringConfig';

const mocks = vi.hoisted(() => {
  const response: JobScoringConfigResponse = {
    success: true,
    message: 'OK',
    data: {
      jobOpeningId: 'job-1',
      isLocked: false,
      lockedReason: null,
      resumeConfig: { weights: [] },
      interviewConfig: { weights: [] },
    },
  };
  return {
    response,
    update: vi.fn(),
    reset: vi.fn(),
    navigate: vi.fn(),
    dispatch: vi.fn(),
    toast: vi.fn(),
  };
});

vi.mock('react-redux', () => ({ useDispatch: () => mocks.dispatch }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('../../../src/hooks/useIsEditingDraft', () => ({ useIsEditingDraft: () => false }));
vi.mock('../../../src/components/shared/ui/toast', () => ({ showToast: mocks.toast }));
vi.mock('../../../src/shared/utils/auth/jobError.helpers', () => ({
  getJobErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../../../src/api/job-service/JobOpening/AddJobOpening', () => ({
  useDeleteDraftJobMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('../../../src/redux/slices/jobOpeningSlice', () => ({
  setIsScoringCompleted: (payload: boolean) => ({ type: 'complete', payload }),
  setEditScoringPassedJobId: (payload: string) => ({ type: 'jobId', payload }),
}));
vi.mock('../../../src/api/job-service/JobOpening/jobScoringConfig', () => ({
  useGetJobScoringConfigQuery: () => ({ data: mocks.response, isLoading: false }),
  useUpdateJobScoringConfigMutation: () => [mocks.update, { isLoading: false }],
  useResetJobScoringConfigMutation: () => [mocks.reset, { isLoading: false }],
  jobScoringConfigApi: {
    util: {
      updateQueryData: (
        _endpoint: string,
        _jobId: string,
        recipe: (draft: JobScoringConfigResponse) => void
      ) => {
        mocks.response = { ...mocks.response };
        recipe(mocks.response);
        return { type: 'patch' };
      },
    },
  },
}));
vi.mock('../../../src/components/shared', async () => {
  const { ScoringWeightCard } = await import('../../../src/components/shared/ui/scoringWeightCard');
  const { Button } = await import('../../../src/components/shared/ui/button');
  const { normalizeScoringWeights } = await import('../../../src/components/shared/scoringWeight');
  return {
    ScoringWeightCard,
    Button,
    normalizeScoringWeights,
    RESUME_CATEGORY_META: {},
    INTERVIEW_CATEGORY_META: {},
  };
});

const makeWeights = (prefix: string, first = 60, second = 40) => [
  { id: `${prefix}-a`, categoryName: 'CATEGORY_A', weightPercentage: first },
  { id: `${prefix}-b`, categoryName: 'CATEGORY_B', weightPercentage: second },
];

const getCard = (title: string): HTMLElement => {
  const card = screen.getByRole('heading', { name: title }).closest('.bg-white');
  if (!(card instanceof HTMLElement)) throw new Error('Scoring card not found');
  return card;
};

const editDistribution = async (title: string): Promise<void> => {
  const user = userEvent.setup();
  const [first, second] = within(getCard(title)).getAllByRole('spinbutton');
  await user.clear(second);
  await user.type(second, '30');
  await user.clear(first);
  await user.type(first, '70');
  await user.tab();
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.response = {
    ...mocks.response,
    data: {
      ...mocks.response.data,
      isLocked: false,
      resumeConfig: { weights: makeWeights('resume') },
      interviewConfig: { weights: makeWeights('interview') },
    },
  };
  mocks.update.mockImplementation(
    ({ resumeWeights, interviewWeights }: UpdateJobScoringConfigRequest) => ({
      unwrap: () =>
        Promise.resolve({
          ...mocks.response,
          data: {
            ...mocks.response.data,
            resumeConfig: { weights: resumeWeights },
            interviewConfig: { weights: interviewWeights },
          },
        }),
    })
  );
  mocks.reset.mockImplementation(() => ({
    unwrap: () => Promise.resolve(mocks.response),
  }));
});

describe('JobScoringCriteriaTab pending changes', () => {
  it('shows only the general Next action and one page-level reset', async () => {
    render(<JobScoringCriteriaTab jobId="job-1" />);
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Reset to Defaults' })).toHaveLength(1);
    ['Resume Scoring Categories', 'Interview Scoring Categories'].forEach((title) => {
      expect(within(getCard(title)).queryByRole('button')).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith('/interview-setup');
  });

  it('blocks invalid edits and returns to Next when edits are reverted', async () => {
    render(<JobScoringCriteriaTab jobId="job-1" />);
    const user = userEvent.setup();
    const [, second] = within(getCard('Resume Scoring Categories')).getAllByRole('spinbutton');
    await user.clear(second);
    await user.type(second, '30');
    expect(screen.getByRole('button', { name: 'Save & Next' })).toBeDisabled();

    await user.clear(second);
    await user.type(second, '40');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('saves both pending distributions through the general Save & Next action', async () => {
    render(<JobScoringCriteriaTab jobId="job-1" />);
    await editDistribution('Resume Scoring Categories');
    expect(screen.getByRole('button', { name: 'Save & Next' })).toBeEnabled();
    await editDistribution('Interview Scoring Categories');

    await userEvent.click(screen.getByRole('button', { name: 'Save & Next' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/interview-setup'));
    expect(mocks.update).toHaveBeenCalledWith({
      jobId: 'job-1',
      resumeWeights: makeWeights('resume', 70, 30),
      interviewWeights: makeWeights('interview', 70, 30),
    });
  });

  it('hides reset and save controls in view mode', () => {
    render(<JobScoringCriteriaTab jobId="job-1" isViewMode />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('confirms a reset of both sections and clears their pending changes', async () => {
    render(<JobScoringCriteriaTab jobId="job-1" />);
    await editDistribution('Resume Scoring Categories');
    await editDistribution('Interview Scoring Categories');
    await userEvent.click(screen.getByRole('button', { name: 'Reset to Defaults' }));
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', {
        name: 'Reset both resume and interview scoring weights to defaults? Any unsaved changes will be discarded.',
      })
    ).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Reset to Defaults' })[1]);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
    expect(mocks.reset).toHaveBeenCalledWith({ jobId: 'job-1' });
    ['Resume Scoring Categories', 'Interview Scoring Categories'].forEach((title) => {
      expect(within(getCard(title)).getAllByRole('spinbutton')[0]).toHaveValue(60);
    });
  });

  it('preserves pending edits when reset confirmation is closed', async () => {
    render(<JobScoringCriteriaTab jobId="job-1" />);
    await editDistribution('Resume Scoring Categories');
    await userEvent.click(screen.getByRole('button', { name: 'Reset to Defaults' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save & Next' })).toBeEnabled();
  });

  it('hides reset when scoring is locked', () => {
    mocks.response.data.isLocked = true;
    render(<JobScoringCriteriaTab jobId="job-1" />);
    expect(screen.queryByRole('button', { name: 'Reset to Defaults' })).not.toBeInTheDocument();
    screen.getAllByRole('spinbutton').forEach((input) => expect(input).toBeDisabled());
  });

  it('keeps pending changes and does not navigate when saving fails', async () => {
    mocks.update.mockReturnValue({ unwrap: () => Promise.reject(new Error('Save failed')) });
    render(<JobScoringCriteriaTab jobId="job-1" />);
    await editDistribution('Resume Scoring Categories');
    await userEvent.click(screen.getByRole('button', { name: 'Save & Next' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }))
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save & Next' })).toBeEnabled();
    expect(within(getCard('Resume Scoring Categories')).getAllByRole('spinbutton')[0]).toHaveValue(
      70
    );
  });

  it('preserves the edit-mode next route without saving unchanged weights', async () => {
    render(<JobScoringCriteriaTab jobId="job-1" isEditMode />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/jobs/edit/job-1/interview');
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
