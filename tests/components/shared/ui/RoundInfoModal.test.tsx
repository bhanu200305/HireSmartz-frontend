import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoundInfoModal from '../../../../src/components/shared/ui/RoundInfoModal';

describe('RoundInfoModal', () => {
  it('shows the round name, variant label and only the round description', () => {
    render(
      <RoundInfoModal
        roundName="Hiring Panel Round"
        badgeLabel="Remote Panel"
        description="Human-conducted interview round."
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Hiring Panel Round')).toBeTruthy();
    expect(screen.getByText('Remote Panel')).toBeTruthy();
    expect(screen.getByText('Human-conducted interview round.')).toBeTruthy();
    expect(screen.queryByText('Objective')).toBeNull();
    expect(screen.queryByText('Procedure')).toBeNull();
  });

  it('says so when the round has no description', () => {
    render(<RoundInfoModal roundName="Resume Screening" description={null} onClose={vi.fn()} />);
    expect(screen.getByText('No description has been added for this round.')).toBeTruthy();
  });

  it('closes from the cross and from the backdrop, but not from inside the panel', () => {
    const onClose = vi.fn();
    const { container } = render(
      <RoundInfoModal roundName="Resume Screening" description="x" onClose={onClose} />
    );
    fireEvent.click(screen.getByText('x'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
