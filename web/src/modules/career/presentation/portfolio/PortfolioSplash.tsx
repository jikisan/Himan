import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { splitWordmark } from '@himan/shared/career';

const SPLASH_MS = 1850;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface PortfolioSplashProps {
  name: string;
  tagline: string | null;
  onLift: () => void;
}

export const PortfolioSplash = ({ name, tagline, onLift }: PortfolioSplashProps) => {
  const [visible, setVisible] = useState(true);
  const [first, last] = splitWordmark(name);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      setVisible(false);
      onLift();
    }, SPLASH_MS);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previous;
    };
  }, [onLift]);

  return (
    <AnimatePresence onExitComplete={() => (document.body.style.overflow = '')}>
      {visible && (
        <motion.div
          key="splash"
          aria-hidden
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[var(--pf-navy)] px-6"
          exit={{ y: '-100%' }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.div
            className="pointer-events-none absolute h-[40rem] w-[40rem] rounded-full bg-[var(--pf-sky)]/20 blur-[120px]"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          <div className="relative flex flex-col items-start">
            <motion.p
              className="pf-display flex flex-wrap gap-x-[0.25em] overflow-hidden pb-[0.08em] text-[clamp(2.5rem,9vw,5.5rem)]"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
            >
              {[first, last].filter(Boolean).map((part, i) => (
                <motion.span
                  key={part}
                  className={i === 1 ? 'text-[var(--pf-sky)]' : 'text-white'}
                  variants={{
                    hidden: { y: 26, opacity: 0 },
                    show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE_OUT } },
                  }}
                >
                  {part}
                </motion.span>
              ))}
            </motion.p>
            <motion.span
              className="mt-4 block h-[3px] w-full origin-left bg-[var(--pf-sky)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.5, ease: EASE_OUT }}
            />
            {tagline && (
              <motion.p
                className="pf-label mt-5 text-[var(--pf-muted)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7, ease: 'easeOut' }}
              >
                {tagline}
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
