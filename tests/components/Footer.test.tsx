import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import Footer from '../../src/components/Footer';

describe('Footer', () => {
  it('renders the copyright notice with the current year', () => {
    render(<Footer />);

    expect(screen.getByText(new RegExp(`Copyright ©${dayjs().year()}`, 'i'))).toBeInTheDocument();
  });

  it('renders the support contact email', () => {
    render(<Footer />);

    expect(screen.getByText('support@hiresmartz.com')).toBeInTheDocument();
  });

  it('applies an extra className to the root element', () => {
    render(<Footer className="custom-footer" />);

    expect(screen.getByRole('contentinfo')).toHaveClass('custom-footer');
  });
});
