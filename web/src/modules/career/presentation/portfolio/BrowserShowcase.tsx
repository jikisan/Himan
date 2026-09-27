import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Lock, RotateCw } from 'lucide-react';
import { hostOf, yearSpan, type PortfolioProject } from '@himan/shared/career';
import { SectionHeading } from './SectionHeading';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const OpenLive = ({ url, className = '' }: { url: string; className?: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noreferrer"
    className={`group inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--pf-sky)] transition-colors hover:text-white ${className}`}
  >
    Open live
    <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
  </a>
);

// The signature interaction: the build list drives a browser frame that
// runs the real site. Sites that refuse framing show the frame's own
// placeholder plus the always-present "Open live" link.
export const BrowserShowcase = ({ projects }: { projects: PortfolioProject[] }) => {
  const [activeId, setActiveId] = useState(projects[0].id);
  const active = projects.find((p) => p.id === activeId) ?? projects[0];
  const year = yearSpan(active.startDate, active.endDate);

  return (
    <section aria-labelledby="live-title" className="border-y border-[var(--pf-line)] bg-[var(--pf-navy)]/40">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 md:py-32">
        <SectionHeading
          id="live-title"
          lead="Live builds that run in"
          accent="the browser."
          aside="Previewed exactly as they run. Pick one to load it."
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <ul className="flex flex-col" role="tablist" aria-label="Live builds">
            {projects.map((project) => {
              const selected = project.id === active.id;
              return (
                <li key={project.id} className="relative border-b border-[var(--pf-line)] first:border-t">
                  {selected && (
                    <motion.span
                      layoutId="pf-live-indicator"
                      className="absolute inset-y-0 left-0 w-full bg-[var(--pf-sky)]/10"
                      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                      aria-hidden
                    />
                  )}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveId(project.id)}
                    className="relative flex w-full cursor-pointer flex-col items-start gap-1 px-4 py-5 text-left"
                  >
                    <span
                      className={`text-lg font-bold transition-colors [font-variation-settings:'wdth'_110] ${selected ? 'text-white' : 'text-[var(--pf-muted)] hover:text-white'}`}
                    >
                      {project.name}
                    </span>
                    <span className="text-sm text-[var(--pf-faint)]">{project.url && hostOf(project.url)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-[var(--pf-line-strong)] bg-[var(--pf-ink)] shadow-[0_40px_90px_-40px_rgb(0_0_0_/_0.9)]">
              <div className="flex items-center gap-3 border-b border-[var(--pf-line)] bg-[var(--pf-ink-soft)] px-4 py-3">
                <span className="flex gap-1.5" aria-hidden>
                  <span className="h-3 w-3 rounded-full bg-white/15" />
                  <span className="h-3 w-3 rounded-full bg-white/15" />
                  <span className="h-3 w-3 rounded-full bg-white/15" />
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[var(--pf-ink)] px-3 py-1.5 text-xs text-[var(--pf-muted)]">
                  <Lock className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{active.url}</span>
                </span>
                <RotateCw className="h-3.5 w-3.5 text-[var(--pf-faint)]" aria-hidden />
              </div>

              {/* 1280px site rendered at half scale: desktop layout, frame-sized. */}
              <div className="relative aspect-[16/10] overflow-hidden bg-[var(--pf-ink)]">
                <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                  <p className="pf-display text-[clamp(1.5rem,4vw,3rem)] text-white/10">{hostOf(active.url!)}</p>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.iframe
                    key={active.id}
                    src={active.url!}
                    title={`${active.name} live preview`}
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    referrerPolicy="no-referrer"
                    className="absolute left-0 top-0 hidden h-[200%] w-[200%] origin-top-left scale-50 border-0 md:block"
                    initial={{ opacity: 0, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(8px)' }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                  />
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--pf-muted)]">
                {active.category && (
                  <span className="rounded-full border border-[var(--pf-line-strong)] px-3 py-1 text-white/90">
                    {active.category}
                  </span>
                )}
                {year && <span className="pf-tabular">{year}</span>}
              </div>
              <OpenLive url={active.url!} />
            </div>
            {(active.outcome || active.description) && (
              <p className="max-w-[65ch] text-[var(--pf-muted)]">{active.outcome ?? active.description}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
