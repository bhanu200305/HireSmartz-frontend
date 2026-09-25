import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScoringWeightCard } from '../../../../src/components/shared/ui/scoringWeightCard';
import type { ScoringWeight } from '../../../../src/components/shared/scoringWeight';
import type { ScoringCategoryMeta } from '../../../../src/components/shared/scoringCategories';

const categoryMeta: ScoringCategoryMeta = {
  CATEGORY_A: { label: 'Category A', description: '', color: '#000', defaultPct: 60 },
  CATEGORY_B: { label: 'Category B', description: '', color: '#000', defaultPct: 40 },
};

const weights: ScoringWeight[] = [
  { id: 'a', categoryName: 'CATEGORY_A', displayName: 'Category A', weightPercentage: 60 },
  { id: 'b', categoryName: 'CATEGORY_B', displayName: 'Category B', weightPercentage: 40 },
];

const baseProps = {
  title: 'Scoring',
  subtitle: '',
  infoText: '',
  weights,
  categoryMeta,
  onSave: vi.fn().mockResolvedValue(undefined),
  onReset: vi.fn().mockResolvedValue(undefined),
  isSaving: false,
  isResetting: false,
  editable: true,
};

describe('ScoringWeightCard — weight sum can never exceed 100', () => {
  it('caps a field at its own current value when the total already sits at 100', () => {
    render(<ScoringWeightCard {...baseProps} />);

    const [inputA] = screen.getAllByRole('spinbutton');
    fireEvent.change(inputA, { target: { value: '90' } });

    // Total was already 100, so A has no budget to grow into until B shrinks.
    expect(inputA).toHaveValue(60);
  });

  it('lets a field grow only by the amount freed up elsewhere', () => {
    render(<ScoringWeightCard {...baseProps} />);

    const [inputA, inputB] = screen.getAllByRole('spinbutton');
    fireEvent.change(inputB, { target: { value: '20' } }); // frees 20
    fireEvent.change(inputA, { target: { value: '90' } }); // tries to overshoot

    expect(inputA).toHaveValue(80); // 60 + the 20 freed from B, not 90
  });

  it('never lets the running total shown in the header exceed 100%', () => {
    render(<ScoringWeightCard {...baseProps} />);

    const [inputA] = screen.getAllByRole('spinbutton');
    fireEvent.change(inputA, { target: { value: '999' } });

    expect(screen.getByText('Total: 100%')).toBeInTheDocument();
  });
});
