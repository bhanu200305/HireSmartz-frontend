import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SortableInterviewRounds } from '../../../../src/components/JobsOpening/EditJobOpening/sortableInterviewRounds';

const round = (id: string, name: string, sequence: number) => ({
  id,
  round: { id: `type-${id}`, name },
  sequence,
  description: '',
});

const renderRounds = (withIntake: boolean) =>
  render(
    <SortableInterviewRounds
      isEditMode
      rounds={[
        round('resume', 'Resume Review', 1),
        ...(withIntake ? [round('intake', 'Intake Call', 2)] : []),
        round('video', 'AI Video Interview', withIntake ? 3 : 2),
      ]}
      onRoundsReorder={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      anchorRoundTypeIds={new Set(['type-resume', 'type-intake'])}
      removableAnchorRoundTypeIds={new Set(['type-intake'])}
    />
  );

describe('SortableInterviewRounds controls', () => {
  it('gives the mandatory Resume round no edit or delete control', () => {
    renderRounds(false);
    const resumeCard = screen.getByText(/Resume Review/).closest('div')!.parentElement!;
    expect(resumeCard.querySelector('[aria-label="Delete round"]')).toBeNull();
    expect(resumeCard.querySelector('[aria-label="Edit round"]')).toBeNull();
  });

  it('lets the optional Intake Call be deleted but not edited', () => {
    renderRounds(true);
    expect(screen.getAllByLabelText('Delete round')).toHaveLength(2);
    expect(screen.getAllByLabelText('Edit round')).toHaveLength(1);
  });

  it('keeps edit and delete on an ordinary round', () => {
    renderRounds(false);
    expect(screen.getAllByLabelText('Edit round')).toHaveLength(1);
    expect(screen.getAllByLabelText('Delete round')).toHaveLength(1);
  });
});
