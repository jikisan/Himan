import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { yearSpan, type PortfolioProject } from '@himan/shared/career';
import { SectionHeading } from './SectionHeading';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const TECH_SHOWN = 4;

const linkLabel = (url: string) => {
  if (url.includes('play.google.com')) return 'Google Play';
  if (url.includes('apps.apple.com')) return 'App Store';
  return 'Open live';
};

const BuildCard = ({ project, index }: { project: PortfolioProject; index: number }) => {
  const lead = project.tech[0];
  const target = project.platform.join(' · ');
  const year = yearSpan(project.startDate, project.endDate);
  const extra = project.tech.length - TECH_SHOWN;

  return (
    <motion.article
      className="group relative flex h-full flex-col gap-5 rounded-3xl border border-[var(--pf-line)] bg-[var(--pf-ink-soft)]/60 p-7 transition-colors duration-300 hover:border-[var(--pf-sky)]/60 hover:bg-[var(--pf-ink-soft)]"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.06, ease: EASE_OUT }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="pf-label pf-tabular text-[var(--pf-faint)]">/ Build {String(index + 1).padStart(2, '0')}</span>
        {year && <span className="pf-tabular text-sm text-[var(--pf-faint)]">{year}</span>}
      </div>

      {(lead || target) && (
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
          {lead && <span className="rounded-full bg-[var(--pf-sky)]/15 px-3 py-1 text-[var(--pf-sky-hi)]">{lead}</span>}
          {lead && target && <ArrowRight className="h-4 w-4 text-[var(--pf-faint)]" aria-label="to" />}
          {target && <span className="rounded-full border border-[var(--pf-line-strong)] px-3 py-1">{target}</span>}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {project.category && <p className="pf-label text-[var(--pf-sky)]">{project.category}</p>}
        <h3 className="text-2xl font-bold leading-tight [font-variation-settings:'wdth'_110]">{project.name}</h3>
        {(project.outcome || project.description) && (
          <p className="text-[var(--pf-muted)]">{project.outcome ?? project.description}</p>
        )}
      </div>

      {project.tech.length > 1 && (
        <ul className="mt-auto flex flex-wrap gap-1.5" aria-label="Tech stack">
          {project.tech.slice(1, TECH_SHOWN + 1).map((tech) => (
            <li key={tech} className="rounded-md bg-white/5 px-2 py-1 text-xs text-[var(--pf-muted)]">
              {tech}
            </li>
          ))}
          {extra > 0 && <li className="px-2 py-1 text-xs text-[var(--pf-faint)]">+{extra} more</li>}
        </ul>
      )}

      {project.url && (
        <a
          href={project.url}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex min-h-11 items-center gap-2 border-t border-[var(--pf-line)] pt-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--pf-sky)] transition-colors hover:text-white ${project.tech.length > 1 ? '' : 'mt-auto'}`}
        >
          {linkLabel(project.url)}
          <ArrowUpRight className="h-4 w-4" />
          <span className="sr-only">for {project.name}</span>
        </a>
      )}
    </motion.article>
  );
};

export const BuildGrid = ({ projects }: { projects: PortfolioProject[] }) => (
  <section id="work" aria-labelledby="work-title" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-24 sm:px-8 md:py-32">
    <SectionHeading
      id="work-title"
      lead="See what I've"
      accent="actually built."
      aside={`${projects.length} ${projects.length === 1 ? 'build' : 'builds'} picked for this role.`}
    />
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <BuildCard key={project.id} project={project} index={index} />
      ))}
    </div>
  </section>
);
