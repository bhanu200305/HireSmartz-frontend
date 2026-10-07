import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const jobData = {
  data: {
    interviewRounds: [
      {
        id: 1,
        round: { id: 'r-resume', name: 'Resume Review' },
        description: 'AI resume review.',
        duration: null,
        variant: null,
      },
      {
        id: 2,
        round: { id: 'r-intake', name: 'Renamed Intake' },
        description: 'Phone call.',
        duration: null,
        variant: null,
      },
      {
        id: 3,
        round: { id: 'r-panel', name: 'Hiring Panel Round' },
        description: 'Human panel.',
        duration: 30,
        variant: 'online',
      },
      {
        id: 4,
        round: { id: 'r-video', name: 'AI Video Interview' },
        description: '',
        duration: 45,
        variant: 'soundwave',
      },
    ],
    generalQuestions: [
      { id: 'q1', interviewRoundId: 3, question: 'Tell me about yourself' },
      { id: 'q2', interviewRoundId: 3, question: 'Why this job?' },
    ],
  },
};

const roundTypes = [
  { id: 'r-resume', name: 'Resume Review', special_kind: 'resume', variant_labels: undefined },
  {
    id: 'r-intake',
    name: 'Renamed Intake',
    special_kind: 'intake_call',
    variant_labels: undefined,
  },
  {
    id: 'r-panel',
    name: 'Hiring Panel Round',
    special_kind: null,
    variant_labels: { online: 'Remote Panel' },
  },
  { id: 'r-video', name: 'AI Video Interview', special_kind: null, variant_labels: undefined },
];

vi.mock('../../../../src/api/job-service/JobOpening/GetJobOpeningById', () => ({
  useGetJobOpeningByIdQuery: () => ({ data: jobData, isLoading: false }),
}));
vi.mock('../../../../src/api/job-service/JobOpening/jobQuestions', () => ({
  useGetJobIntakeQuestionsQuery: () => ({
    data: { questions: [{ job_intake_question_id: 'i1', question_text: 'What is your name?' }] },
  }),
}));
vi.mock('../../../../src/hooks/useJobOpeningDropdown', () => ({
  default: () => ({ jobOpeningDropdown: roundTypes }),
}));

import ViewInterviewRound from '../../../../src/components/JobsOpening/ViewJobOpening/ViewInterviewRounds';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ViewInterviewRound />
    </MemoryRouter>
  );

describe('ViewInterviewRounds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows one numbered pill per round and the first round by default', () => {
    renderPage();
    expect(screen.getByRole('button', { name: '1. Resume Review' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '3. Hiring Panel Round' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '1. Resume Review' }).getAttribute('aria-current')
    ).toBe('true');
    expect(screen.getByText('AI resume review.')).toBeTruthy();
  });

  it('shows no Questions section for the Resume round', () => {
    renderPage();
    expect(screen.queryByText(/^Questions/)).toBeNull();
  });

  it('lists the intake questions for the Intake round even after it was renamed', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '2. Renamed Intake' }));
    expect(screen.getByText('Questions (1)')).toBeTruthy();
    expect(screen.getByText('What is your name?')).toBeTruthy();
  });

  it("lists a round's own questions numbered, with the database variant label and duration", () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '3. Hiring Panel Round' }));
    expect(screen.getByText('Questions (2)')).toBeTruthy();
    expect(screen.getByText('Tell me about yourself')).toBeTruthy();
    expect(screen.getByText('Why this job?')).toBeTruthy();
    expect(screen.getByText('Remote Panel')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
  });

  it('says so when a round has no questions', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '4. AI Video Interview' }));
    expect(screen.getByText('No questions added.')).toBeTruthy();
  });
});
