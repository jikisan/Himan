import type { ComponentProps, ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PortfolioSplash } from '../presentation/portfolio/PortfolioSplash';

// Test readiness and timing without waiting for decorative exit animations.
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, className, role }: ComponentProps<'div'>) => <div className={className} role={role}>{children}</div>,
  },
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.style.overflow = '';
});

describe('portfolio introduction', () => {
  it('waits for data and does not add another delay after a slow fetch', () => {
    const onLift = vi.fn();
    const { rerender } = render(<PortfolioSplash name={null} tagline={null} ready={false} intro onLift={onLift} />);
    expect(screen.getByText('Loading portfolio')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onLift).not.toHaveBeenCalled();

    rerender(<PortfolioSplash name="June Kyle Santerna" tagline={null} ready intro onLift={onLift} />);
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(onLift).toHaveBeenCalledOnce();
  });

  it('lets the visitor skip a ready intro and restores the previous scroll state', () => {
    document.body.style.overflow = 'scroll';
    const onLift = vi.fn();
    render(<PortfolioSplash name="June Kyle Santerna" tagline={null} ready intro onLift={onLift} />);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }));
    expect(document.body.style.overflow).toBe('scroll');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onLift).toHaveBeenCalledOnce();
  });

  it('does not hold a loading screen for repeat visits or reduced motion', () => {
    const onLift = vi.fn();
    const { rerender } = render(<PortfolioSplash name={null} tagline={null} ready={false} intro={false} onLift={onLift} />);
    rerender(<PortfolioSplash name="June Kyle Santerna" tagline={null} ready intro={false} onLift={onLift} />);
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(onLift).toHaveBeenCalledOnce();
  });
});
