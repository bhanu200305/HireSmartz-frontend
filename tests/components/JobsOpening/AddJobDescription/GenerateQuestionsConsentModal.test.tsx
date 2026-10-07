import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenerateQuestionsConsentModal } from '../../../../src/components/JobsOpening/AddJobDescription/GenerateQuestionsConsentModal';

const setup = () => {
  const onConfirm = vi.fn();
  render(
    <GenerateQuestionsConsentModal
      open
      onClose={vi.fn()}
      onConfirm={onConfirm}
      hasExistingQuestions={false}
    />
  );
  const input = screen.getByRole('spinbutton') as HTMLInputElement;
  return { input, onConfirm };
};

describe('GenerateQuestionsConsentModal question count', () => {
  it('caps the field at 25', () => {
    const { input } = setup();
    expect(input.max).toBe('25');
  });

  it('refuses a typed value above 25', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: '26' } });
    expect(input.value).toBe('10');
  });

  it('accepts exactly 25 and sends it', () => {
    const { input, onConfirm } = setup();
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith('REPLACE', 25, null);
  });

  it('falls back to 1 when the field is left empty', () => {
    const { input, onConfirm } = setup();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith('REPLACE', 1, null);
  });
});

describe('GenerateQuestionsConsentModal scoring sections', () => {
  const sections = [
    { code: 'SKILLS_MATCH', label: 'Skills Match' },
    { code: 'PERSONALITY_TRAITS', label: 'Personality Traits' },
    { code: 'CAREER_GOALS', label: 'Career Goals' },
  ];
  const setupSections = () => {
    const onConfirm = vi.fn();
    render(
      <GenerateQuestionsConsentModal
        open
        onClose={vi.fn()}
        onConfirm={onConfirm}
        hasExistingQuestions={false}
        scoringSectionOptions={sections}
      />
    );
    return { onConfirm };
  };
  const chip = (label: string) => screen.getByRole('button', { name: label });

  it('starts with every section selected', () => {
    setupSections();
    sections.forEach(({ label }) => expect(chip(label).className).toContain('border-brand-500'));
  });

  it('sends null (every section) when all are left selected', () => {
    const { onConfirm } = setupSections();
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith('REPLACE', 10, null);
  });

  it('sends only the sections still selected after unticking one', () => {
    const { onConfirm } = setupSections();
    fireEvent.click(chip('Personality Traits'));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith('REPLACE', 10, ['SKILLS_MATCH', 'CAREER_GOALS']);
  });
});
