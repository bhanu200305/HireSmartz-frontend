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
        round: { id: 'r-panel', name: 'Live Video Interview' },
        description: 'Human panel.',
        duration: 30,
        variant: null,
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
    name: 'Live Video Interview',
    special_kind: 'live_video',
    variant_labels: undefined,
  },
  {
    id: 'r-video',
    name: 'AI Video Interview',
    special_kind: null,
    variant_labels: { soundwave: 'Voice Agent' },
  },
];

vi.mock('../../../../src/api/job-service/JobOpening/GetJobOpeningById', () => ({
  useGetJobOpeningByIdQuery: () => ({ data: jobData, isLoading: false }),
}));
// The round's own question list (answers, order). `undefined` = not loaded yet.
let questionsData: { rounds: unknown[] } | undefined;

vi.mock('../../../../src/api/job-service/JobOpening/jobQuestions', () => ({
  useGetJobIntakeQuestionsQuery: () => ({
    data: { questions: [{ job_intake_question_id: 'i1', question_text: 'What is your name?' }] },
  }),
  useGetJobQuestionsQuery: () => ({ data: questionsData }),
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
    expect(screen.getByRole('button', { name: '3. Live Video Interview' })).toBeTruthy();
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

  it("lists a round's own questions numbered, with its duration and no variant", () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '3. Live Video Interview' }));
    expect(screen.getByText('Questions (2)')).toBeTruthy();
    expect(screen.getByText('Tell me about yourself')).toBeTruthy();
    expect(screen.getByText('Why this job?')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
    expect(screen.queryByText('Voice Agent')).toBeNull();
  });

  it('shows the database variant label for the AI Video round', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '4. AI Video Interview' }));
    expect(screen.getByText('Voice Agent')).toBeTruthy();
  });

  it('says so when a round has no questions', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '4. AI Video Interview' }));
    expect(screen.getByText('No questions added.')).toBeTruthy();
  });

  const roundWith = (questions: unknown[]) => ({
    rounds: [{ round_instance_id: 3, questions }],
  });

  it("shows each question's answer under it", () => {
    questionsData = roundWith([
      { id: 'q1', question_text: 'Tell me about yourself', answer_text: 'Look for a short story.' },
    ]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '3. Live Video Interview' }));
    expect(screen.getByText('Tell me about yourself')).toBeTruthy();
    expect(screen.getByText('Look for a short story.')).toBeTruthy();
  });

  it('marks an answer the AI wrote', () => {
    questionsData = roundWith([
      {
        id: 'q1',
        question_text: 'Explain REST',
        answer_text: 'Resources over HTTP.',
        is_answer_ai_generated: true,
      },
    ]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '3. Live Video Interview' }));
    expect(screen.getByText('AI-written answer')).toBeTruthy();
  });

  it('has no AI tag for an answer the user wrote', () => {
    questionsData = roundWith([
      {
        id: 'q1',
        question_text: 'Explain REST',
        answer_text: 'Mine.',
        is_answer_ai_generated: false,
      },
    ]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '3. Live Video Interview' }));
    expect(screen.queryByText('AI-written answer')).toBeNull();
  });

  it('marks a question that is not asked', () => {
    questionsData = roundWith([
      { id: 'q1', question_text: 'Skipped one', answer_text: null, is_selected: false },
      { id: 'q2', question_text: 'Asked one', answer_text: null, is_selected: true },
    ]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '3. Live Video Interview' }));
    expect(screen.getAllByText('Not asked')).toHaveLength(1);
  });

  it("lists the questions in the round's saved order", () => {
    questionsData = roundWith([
      { id: 'q2', question_text: 'Second by order', answer_text: null },
      { id: 'q1', question_text: 'First listed', answer_text: null },
    ]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '3. Live Video Interview' }));
    const texts = screen.getAllByRole('listitem').map((item) => item.textContent ?? '');
    expect(texts[0]).toContain('Second by order');
    expect(texts[1]).toContain('First listed');
  });

  it('falls back to the plain list while the round questions have not loaded', () => {
    questionsData = undefined;
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '3. Live Video Interview' }));
    expect(screen.getByText('Tell me about yourself')).toBeTruthy();
    expect(screen.queryByText(/Answer:/)).toBeNull();
  });
});
