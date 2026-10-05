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
