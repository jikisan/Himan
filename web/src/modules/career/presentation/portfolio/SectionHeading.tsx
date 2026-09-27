import { motion } from 'motion/react';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface SectionHeadingProps {
  id?: string;
  lead: string;
  accent: string;
  aside?: string;
}

// Two-tone heading: the plain half states the setup, the sky half lands
// the claim. It rises out of a mask — the splash wordmark's move, reused —
// while the content below fades up, so headings and content don't enter
// the same way. The observer watches the unmasked wrapper, never the
// clipped text.
export const SectionHeading = ({ id, lead, accent, aside }: SectionHeadingProps) => (
  <motion.div
    className="mb-10 flex flex-col gap-4 md:mb-14 md:flex-row md:items-end md:justify-between"
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.4 }}
  >
    <h2 id={id} className="pf-display max-w-[16ch] overflow-hidden pb-[0.06em] text-[clamp(2rem,5.5vw,4rem)]">
      <motion.span
        className="block"
        variants={{ hidden: { y: '105%' }, show: { y: 0, transition: { duration: 0.8, ease: EASE_OUT } } }}
      >
        {lead} <span className="text-[var(--pf-sky)]">{accent}</span>
      </motion.span>
    </h2>
    {aside && (
      <motion.p
        className="max-w-[40ch] text-[var(--pf-muted)] md:text-right"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.6, delay: 0.25 } } }}
      >
        {aside}
      </motion.p>
    )}
  </motion.div>
);
