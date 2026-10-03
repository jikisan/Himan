import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PortfolioBackToTop, PortfolioNavigation } from '../presentation/portfolio/PortfolioNavigation';

describe('portfolio navigation', () => {
  it('shows section links directly and supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<PortfolioNavigation sections={[{ label: 'About', href: '#about' }, { label: 'Contact', href: '#contact' }]} />);
    const about = screen.getByRole('link', { name: 'About' });
    const contact = screen.getByRole('link', { name: 'Contact' });
    expect(about).toBeVisible();
    expect(about).toHaveAttribute('href', '#about');
    expect(contact).toBeVisible();
    expect(contact).toHaveAttribute('href', '#contact');
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
    await user.tab();
    expect(about).toHaveFocus();
    await user.tab();
    expect(contact).toHaveFocus();
  });

  it('provides an accessible top link', () => {
    render(<PortfolioBackToTop />);
    expect(screen.getByRole('link', { name: 'Back to top' })).toHaveAttribute('href', '#top');
  });
});
