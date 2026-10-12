import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select } from '../../../src/components/shared/ui/select';

describe('shared Select', () => {
  it('says there is no data instead of opening as an empty list', () => {
    render(<Select appname="cfp" placeholder="Office (optional)" options={[]} />);

    const none = screen.getByRole('option', { name: 'No data available', hidden: true });
    expect(none).toBeDisabled();
  });

  it('lists the options and shows no empty message when there are some', () => {
    render(
      <Select
        appname="cfp"
        placeholder="Office (optional)"
        options={[{ label: 'Pune, MG Road', value: 'o1' }]}
      />
    );

    expect(screen.getByRole('option', { name: 'Pune, MG Road', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'No data available', hidden: true })).toBeNull();
  });
});
