import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../../../../src/components/shared';

describe('shared Input', () => {
  it('starts text 16px in (px-4), matching the job dropdowns', () => {
    render(<Input placeholder="Name" />);
    const input = screen.getByPlaceholderText('Name');
    expect(input.className).toContain('px-4');
    expect(input.className).not.toContain('px-3');
  });

  it('lets a caller add its own classes without losing the standard padding', () => {
    render(<Input placeholder="Code" className="uppercase" />);
    const input = screen.getByPlaceholderText('Code');
    expect(input.className).toContain('px-4');
    expect(input.className).toContain('uppercase');
  });
});
