import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowUpRight, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { hostOf, scrollStep, yearSpan, type PortfolioProject } from '@himan/shared/career';
import { SectionHeading } from './SectionHeading';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
// Scroll distance each tab gets while the browser is pinned.
const VH_PER_TAB = 70;

const Favicon = ({ name, active }: { name: string; active: boolean }) => (
  <span
    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-black ${active ? 'bg-[var(--pf-sky)] text-[var(--pf-ink)]' : 'bg-white/15 text-white/70'}`}
    aria-hidden
  >
    {name.charAt(0).toUpperCase()}
  </span>
);

// The reference's "Web & Platform Builds": a browser window pins to the
// screen and each stretch of scroll switches to the next tab, updating the
// address bar and the screenshot. Tabs and thumbnails jump straight there.
export const BrowserTabs = ({ projects }: { projects: PortfolioProject[] }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActive(scrollStep(v, projects.length)));

  const current = projects[active];
  const year = yearSpan(current.startDate, current.endDate);
  const image = current.images[0] ?? null;
  const address = current.url ?? `${current.name.toLowerCase().replace(/\s+/g, '-')}.build`;

  // Scroll to the middle of tab i's share, so the pinned view lands on it.
  const jumpTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const span = track.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + 0.5) / projects.length), behavior: 'smooth' });
  };

  return (
    <section id="live" aria-labelledby="live-title" className="scroll-mt-24 border-y border-[var(--pf-line)] bg-[var(--pf-navy)]/40 pt-24 md:pt-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <SectionHeading
          id="live-title"
          lead="Live systems that run in"
          accent="the browser."
          aside="Dashboards, storefronts and tools, shown as they run. Keep scrolling to switch tabs."
        />
      </div>

      <div ref={trackRef} className="relative" data-testid="browser-tabs" style={{ height: `calc(${projects.length * VH_PER_TAB}vh + 100dvh)` }}>
        <div className="sticky top-0 flex h-dvh flex-col justify-center gap-5 px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-[var(--pf-line-strong)] bg-[var(--pf-ink)] shadow-[0_40px_90px_-40px_rgb(0_0_0_/_0.9)]">
            {/* Tab strip */}
            <div className="flex items-end gap-3 bg-[var(--pf-ink-soft)] px-4 pt-3 max-md:hidden" role="tablist" aria-label="Web builds">
              <span className="flex gap-1.5 pb-3" aria-hidden>
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]/80" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]/80" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]/80" />
              </span>
              <div className="flex min-w-0 flex-1">
                {projects.map((project, i) => {
                  const selected = i === active;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => jumpTo(i)}
                      className={`relative flex min-w-0 max-w-[11rem] flex-1 cursor-pointer items-center gap-2 rounded-t-lg px-3 py-2 text-left text-xs transition-colors ${selected ? 'text-white' : 'text-[var(--pf-muted)] hover:text-white'}`}
                    >
                      {selected && (
                        <motion.span
                          layoutId="pf-browser-tab"
                          className="absolute inset-0 rounded-t-lg bg-[var(--pf-ink)]"
                          transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                          aria-hidden
                        />
                      )}
                      <span className="relative flex min-w-0 items-center gap-2">
                        <Favicon name={project.name} active={selected} />
                        <span className="truncate font-semibold">{project.name}</span>
                        {selected && <X className="h-3 w-3 shrink-0 text-[var(--pf-faint)]" aria-hidden />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Address bar */}
            <div className="flex items-center gap-3 border-b border-[var(--pf-line)] px-4 py-2.5">
              <span className="flex items-center gap-1 text-[var(--pf-faint)]" aria-hidden>
                <ChevronLeft className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
              </span>
              {year && <span className="pf-tabular text-sm text-[var(--pf-muted)] max-sm:hidden">{year}</span>}
              <span className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[var(--pf-ink-soft)] px-4 py-1.5 text-sm text-white/85">
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[var(--pf-faint)]" aria-hidden />
                <span className="truncate" data-testid="browser-address">
                  {current.url ? current.url.replace(/^https?:\/\//, '') : address}
                </span>
              </span>
              {current.url && (
                <a
                  href={current.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${current.name} live`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--pf-line-strong)] text-[var(--pf-sky)] transition-colors hover:bg-[var(--pf-sky)] hover:text-[var(--pf-ink)]"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* Page */}
            <div className="relative aspect-[16/10] max-h-[58dvh] w-full overflow-hidden bg-[var(--pf-ink)]">
              <AnimatePresence initial={false}>
                <motion.div
                  key={current.id}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE_OUT }}
                >
                  {image ? (
                    <img src={image} alt={`${current.name} screenshot`} loading="lazy" className="h-full w-full object-cover object-top" draggable={false} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <p className="pf-display text-[clamp(1.5rem,4vw,3rem)] text-white/10">{current.url ? hostOf(current.url) : current.name}</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              {current.category && (
                <span className="absolute left-3 top-3 rounded-full bg-[var(--pf-navy)]/90 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-lg sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-xs">
                  {current.category}
                </span>
              )}
            </div>
          </div>

          {/* Progress + thumbnails */}
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4">
            <div className="h-[3px] w-full max-w-md overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full origin-left bg-[var(--pf-sky)]" style={{ scaleX: scrollYProgress }} />
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {projects.map((project, i) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={`Show ${project.name}`}
                  aria-current={i === active}
                  className={`h-12 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 bg-[var(--pf-ink-soft)] transition-all ${i === active ? 'border-[var(--pf-sky)] opacity-100' : 'border-transparent opacity-50 hover:opacity-90'}`}
                >
                  {project.images[0] ? (
                    <img src={project.images[0]} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                  ) : (
                    <span className="text-xs font-bold text-white/60">{project.name.charAt(0)}</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-sm text-[var(--pf-muted)] md:hidden">
              <span className="pf-tabular">
                {active + 1} / {projects.length}
              </span>{' '}
              · <span className="font-semibold text-white">{current.name}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
