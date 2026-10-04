import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BackButton from '../../../../src/components/shared/ui/BackButton';

describe('BackButton', () => {
  it('shows "Back" by default and calls onClick', () => {
    const onClick = vi.fn();
    render(<BackButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows a custom label', () => {
    render(<BackButton onClick={vi.fn()} label="Back to Candidate List" />);
    expect(screen.getByRole('button', { name: 'Back to Candidate List' })).toBeTruthy();
  });

  it('is a plain button, so it never submits a form', () => {
    render(<BackButton onClick={vi.fn()} />);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('adds the caller spacing class', () => {
    render(<BackButton onClick={vi.fn()} className="mb-4" />);
    expect(screen.getByRole('button').className).toContain('mb-4');
  });
});
