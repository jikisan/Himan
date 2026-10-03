import { motion } from 'motion/react';
import { ArrowDown, ArrowUpRight, MapPin } from 'lucide-react';
import { splitWordmark, type PortfolioData } from '@himan/shared/career';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface PortfolioHeroProps {
  data: PortfolioData;
  /** Seconds to hold the entrance while the splash is still covering it. */
  delay: number;
  portraitUrl: string | null;
}

export const PortfolioHero = ({ data, delay, portraitUrl }: PortfolioHeroProps) => {
  const { profile, itemName } = data;
  const [first, last] = splitWordmark(profile.fullName ?? itemName);
  const contactHref = profile.email ? `mailto:${profile.email}` : '#contact';

  const rise = (order: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: delay + order * 0.09, ease: EASE_OUT },
  });

  return (
    <section id="about" className="relative isolate overflow-hidden scroll-mt-24">
      <div className="pf-grid absolute inset-0 -z-10 opacity-60" aria-hidden />
      <div
        className="absolute -right-40 -top-40 -z-10 h-[36rem] w-[36rem] rounded-full bg-[var(--pf-sky)]/15 blur-[140px]"
        aria-hidden
      />

      <div className={`mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-8 ${portraitUrl ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}`}>
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

          {data.summary && (
            <motion.p className="mt-6 max-w-[60ch] whitespace-pre-line text-lg text-[var(--pf-muted)]" {...rise(3)}>
              {data.summary}
            </motion.p>
          )}

          <motion.div className="mt-10 flex flex-wrap items-center gap-3" {...rise(4)}>
            <a
              href={data.projects.length > 0 ? '#work' : '#contact'}
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--pf-sky)] px-7 text-sm font-bold uppercase tracking-[0.12em] text-[var(--pf-ink)] transition-colors duration-200 hover:bg-white"
            >
              {data.projects.length > 0 ? 'See the work' : 'Get in touch'}
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
        {portraitUrl && <motion.img
          src={portraitUrl}
          alt={profile.fullName ? `Portrait of ${profile.fullName}` : 'Portfolio portrait'}
          width={1254}
          height={1254}
          loading="eager"
          fetchPriority="high"
          draggable={false}
          className="mx-auto aspect-square w-full max-w-md object-contain [mask-image:linear-gradient(to_bottom,black_75%,transparent)]"
          {...rise(4)}
        />}
      </div>
    </section>
  );
};
