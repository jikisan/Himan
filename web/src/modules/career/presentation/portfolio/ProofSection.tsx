import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { parseMetric, type PortfolioProject } from '@himan/shared/career';
import { SectionHeading } from './SectionHeading';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// Counts a leading quantity up once it scrolls in; ranks and words
// render as written.
const Metric = ({ value }: { value: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const reduce = useReducedMotion();
  const parsed = parseMetric(value);
  const [shown, setShown] = useState(parsed && !reduce ? `${parsed.prefix}0${parsed.suffix}` : value);

  useEffect(() => {
    if (!parsed || reduce || !inView) return;
    const controls = animate(0, parsed.value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => setShown(`${parsed.prefix}${n.toFixed(parsed.decimals)}${parsed.suffix}`),
    });
    return () => controls.stop();
    // parsed is derived from value; depending on value keeps this stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className="pf-tabular" aria-label={value}>
      {shown}
    </span>
  );
};

export const ProofSection = ({ project }: { project: PortfolioProject }) => {
  const claim = project.outcome ?? project.name;
  const attribution = [project.name, project.category].filter(Boolean).join(' · ');

  return (
    <section aria-labelledby="proof-title" className="mx-auto max-w-6xl px-4 py-24 sm:px-8 md:py-32">
      <SectionHeading id="proof-title" lead="Enough about method." accent="Here's the proof." />

      <motion.article
        className="relative grid overflow-hidden rounded-[2rem] bg-[var(--pf-navy)] shadow-[0_30px_80px_-30px_rgb(14_165_233_/_0.35)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        <div className="relative flex flex-col justify-end gap-3 border-b border-[var(--pf-line)] p-8 md:border-b-0 md:border-r md:p-12">
          <div
            className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[var(--pf-sky)]/25 blur-[90px]"
            aria-hidden
          />
          <p className="pf-display relative text-[clamp(3.25rem,9vw,6rem)] leading-[0.9] break-words text-[var(--pf-sky)]">
            <Metric value={project.proofMetric ?? (project.url ? 'Live' : 'Shipped')} />
          </p>
          {project.proofLabel && <p className="pf-label relative text-[var(--pf-sky-hi)]">{project.proofLabel}</p>}
        </div>

        <div className="flex flex-col gap-6 p-8 md:p-12">
          <h3 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-tight [font-variation-settings:'wdth'_110] [text-wrap:balance]">
            {claim}
          </h3>
          {project.description && <p className="max-w-[60ch] text-[var(--pf-muted)]">{project.description}</p>}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-[var(--pf-line)] pt-6">
            <p className="text-sm font-semibold text-white/80">{attribution}</p>
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--pf-sky)] transition-colors hover:text-white"
              >
                Open it
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            )}
          </div>
        </div>
      </motion.article>
    </section>
  );
};
