import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { splitWordmark } from '@himan/shared/career';

const INTRO_MS = 1250;

interface PortfolioSplashProps {
  name: string | null;
  tagline: string | null;
  ready: boolean;
  intro: boolean;
  onLift: () => void;
  portraitUrl?: string | null;
}

export const PortfolioSplash = ({ name, tagline, ready, intro, onLift, portraitUrl }: PortfolioSplashProps) => {
  const [visible, setVisible] = useState(!ready || intro);
  const [startedAt] = useState(() => performance.now());
  const [first, last] = splitWordmark(name ?? 'A little introduction.');
  const dismiss = useCallback(() => {
    setVisible(false);
    onLift();
  }, [onLift]);

  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !ready) return;
    // A slow fetch already covers the introduction; never restart its wait.
    const remaining = intro ? Math.max(0, INTRO_MS - (performance.now() - startedAt)) : 0;
    const timer = window.setTimeout(dismiss, remaining);
    return () => window.clearTimeout(timer);
  }, [visible, ready, intro, startedAt, dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          role="status"
          aria-live="polite"
          aria-busy={!ready}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[var(--pf-navy)] px-6"
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="sr-only">{ready ? 'Portfolio ready' : 'Loading portfolio'}</span>
          <div className="pf-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div className="pointer-events-none absolute size-[32rem] rounded-full bg-[var(--pf-sky)]/15 blur-[100px]" aria-hidden />

          <div className="relative flex w-full max-w-3xl flex-col items-center text-center" aria-hidden>
            <p className="pf-label mb-10 text-[var(--pf-sky-hi)]">A person behind the pixels</p>
            {(!ready || portraitUrl) && <div className="relative mb-10 size-40 sm:size-48">
              <div className="absolute -inset-4 rounded-full border border-[var(--pf-line)]" />
              <div className={`absolute -inset-4 rounded-full border border-transparent border-t-[var(--pf-sky)] ${ready ? '' : 'pf-loader-orbit'}`} />
              <div className="absolute -inset-7 rounded-full border border-dashed border-[var(--pf-line)]" />
              <div className="h-full w-full overflow-hidden rounded-full border border-[var(--pf-line-strong)] bg-[var(--pf-ink-soft)]">
                {portraitUrl && <img
                  src={portraitUrl}
                  alt=""
                  width={1254}
                  height={1254}
                  loading="eager"
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />}
              </div>
            </div>}
            <p className="pf-display text-[clamp(2.25rem,7vw,4.5rem)]">
              <span className="block text-white">{first}</span>
              {last && <span className="mt-1 block text-[var(--pf-sky)]">{last}</span>}
            </p>
            {tagline && <p className="mt-5 max-w-xl text-sm text-[var(--pf-muted)] sm:text-base">{tagline}</p>}
            <div className="mt-8 flex min-h-6 items-center gap-2.5 text-xs text-[var(--pf-muted)]">
              <span className={`size-1.5 rounded-full bg-[var(--pf-sky)] ${ready ? '' : 'animate-pulse motion-reduce:animate-none'}`} />
              {ready ? 'Ready. Welcome to my work.' : 'Bringing the portfolio together…'}
            </div>
          </div>

          {ready && intro && (
            <button
              type="button"
              onClick={dismiss}
              className="absolute bottom-6 right-6 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--pf-line-strong)] px-5 text-xs font-medium text-[var(--pf-muted)] transition-colors hover:border-[var(--pf-sky)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pf-sky)]"
            >
              Skip intro
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
