import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUpRight, MapPin } from 'lucide-react';
import { splitWordmark, type PortfolioData, type PortfolioProject } from '@himan/shared/career';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// First-viewport proof: the top three builds as a fanned stack of cards,
// so the work is visible before the first scroll. Hover spreads the fan.
const BuildStack = ({ projects, delay }: { projects: PortfolioProject[]; delay: number }) => {
  const cards = projects.slice(0, 3);
  const [open, setOpen] = useState(false);
  // After the first interaction, "rest" is a return trip, not the entrance:
  // drop the splash-length delay so the fan closes immediately.
  const [touched, setTouched] = useState(false);
  const toggle = (next: boolean) => {
    setTouched(true);
    setOpen(next);
  };
  const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
  // Build 01 sits in front; the next two fan out behind it.
  const rest = [
    { rotate: -2, x: 0, y: 30 },
    { rotate: -9, x: -64, y: -30 },
    { rotate: 7, x: 64, y: -46 },
  ];
  const spread = [
    { rotate: -1, x: 0, y: 60 },
    { rotate: -13, x: -104, y: -44 },
    { rotate: 11, x: 104, y: -64 },
  ];

  return (
    <motion.a
      href="#work"
      aria-label="Jump to the builds"
      className="relative hidden h-[22rem] w-full cursor-pointer lg:block"
      initial="hidden"
      animate={open ? 'spread' : 'rest'}
      onHoverStart={() => toggle(true)}
      onHoverEnd={() => toggle(false)}
      onFocus={() => toggle(true)}
      onBlur={() => toggle(false)}
    >
      {cards.map((project, i) => (
        <motion.div
          key={project.id}
          className="absolute left-1/2 top-1/2 -ml-[9.5rem] -mt-[6.5rem] flex h-52 w-[19rem] flex-col justify-between rounded-3xl border border-[var(--pf-line-strong)] bg-[var(--pf-ink-soft)] p-6 shadow-[0_30px_60px_-20px_rgb(0_0_0_/_0.8)]"
          style={{ zIndex: cards.length - i }}
          variants={{
            hidden: { opacity: 0, y: 80, rotate: 0, x: 0 },
            rest: {
              opacity: 1,
              ...rest[i],
              transition: touched ? spring : { duration: 0.9, delay: delay + 0.35 + i * 0.1, ease: EASE_OUT },
            },
            spread: { opacity: 1, ...spread[i], transition: spring },
          }}
        >
          <div className="flex items-center justify-between">
            <span className="pf-label pf-tabular text-[var(--pf-faint)]">/ {String(i + 1).padStart(2, '0')}</span>
            {project.platform[0] && (
              <span className="rounded-full border border-[var(--pf-line-strong)] px-2.5 py-0.5 text-xs text-white/80">
                {project.platform.join(' · ')}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-bold leading-tight [font-variation-settings:'wdth'_112]">{project.name}</p>
            {project.tech.length > 0 && <p className="text-sm text-[var(--pf-sky-hi)]">{project.tech.slice(0, 2).join(' · ')}</p>}
          </div>
        </motion.div>
      ))}
    </motion.a>
  );
};

interface PortfolioHeroProps {
  data: PortfolioData;
  /** Seconds to hold the entrance while the splash is still covering it. */
  delay: number;
}

export const PortfolioHero = ({ data, delay }: PortfolioHeroProps) => {
  const { profile, itemName } = data;
  const [first, last] = splitWordmark(profile.fullName ?? itemName);
  const contactHref = profile.email ? `mailto:${profile.email}` : '#contact';

  const rise = (order: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: delay + order * 0.09, ease: EASE_OUT },
  });

  return (
    <section className="relative isolate overflow-hidden">
      <div className="pf-grid absolute inset-0 -z-10 opacity-60" aria-hidden />
      <div
        className="absolute -right-40 -top-40 -z-10 h-[36rem] w-[36rem] rounded-full bg-[var(--pf-sky)]/15 blur-[140px]"
        aria-hidden
      />

      <div className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col">
          <h1 className="pf-display text-[clamp(2.5rem,9.5vw,5.25rem)] lg:whitespace-nowrap">
            <motion.span className="block text-white" {...rise(0)}>
              {first}
            </motion.span>
            {last && (
              <motion.span className="block text-[var(--pf-sky)]" {...rise(1)}>
                {last}
              </motion.span>
            )}
          </h1>

          <motion.p
            className="mt-8 flex items-center gap-4 text-[clamp(1.125rem,2.4vw,1.5rem)] font-semibold [font-variation-settings:'wdth'_112]"
            {...rise(2)}
          >
            <span className="h-[3px] w-10 shrink-0 bg-[var(--pf-sky)]" aria-hidden />
            {itemName}
          </motion.p>

          {(profile.bio || profile.headline) && (
            <motion.p className="mt-6 max-w-[60ch] text-lg text-[var(--pf-muted)]" {...rise(3)}>
              {profile.bio ?? profile.headline}
            </motion.p>
          )}

          <motion.div className="mt-10 flex flex-wrap items-center gap-3" {...rise(4)}>
            <a
              href="#work"
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--pf-sky)] px-7 text-sm font-bold uppercase tracking-[0.12em] text-[var(--pf-ink)] transition-colors duration-200 hover:bg-white"
            >
              See the work
              <ArrowDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
            </a>
            <a
              href={contactHref}
              className="group inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--pf-line-strong)] px-7 text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-[var(--pf-ink)]"
            >
              Get in touch
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            {profile.location && (
              <span className="ml-1 inline-flex items-center gap-1.5 text-sm text-[var(--pf-faint)]">
                <MapPin className="h-4 w-4" aria-hidden />
                {profile.location}
              </span>
            )}
          </motion.div>
        </div>
        {data.projects.length > 0 && <BuildStack projects={data.projects} delay={delay} />}
      </div>
    </section>
  );
};
